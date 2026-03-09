import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import { transcribeAudio, summarizeTranscript } from '../services/groq.js';
import { chunkAudioFile, cleanupChunks } from '../services/chunker.js';
import db from '../db.js';

const router = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// All routes require authentication
router.use(authenticate);

// POST /api/transcriptions/transcribe — upload and transcribe audio
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  let chunks = [];
  const tempFile = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { title, language } = req.body;
    const audioLanguage = language || 'pt';
    const transcriptionTitle = title || req.file.originalname || 'Untitled';

    chunks = chunkAudioFile(tempFile);

    // Transcribe each chunk with rate-limit delay between them
    const parts = [];
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      const text = await transcribeAudio(chunks[i], audioLanguage, req.file.originalname);
      parts.push(text);
    }

    const fullTranscript = parts.join(' ');

    // Save to database
    const stmt = db.prepare(
      'INSERT INTO transcriptions (user_id, title, audio_language, transcript, file_size) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(req.userId, transcriptionTitle, audioLanguage, fullTranscript, req.file.size);

    res.status(201).json({
      id: result.lastInsertRowid,
      title: transcriptionTitle,
      audio_language: audioLanguage,
      transcript: fullTranscript,
      file_size: req.file.size,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed' });
  } finally {
    // Clean up temp files
    cleanupChunks(chunks, tempFile);
    if (tempFile) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
  }
});

// POST /api/transcriptions/:id/summarize — summarize an existing transcription
router.post('/:id/summarize', async (req, res) => {
  try {
    const transcription = db.prepare(
      'SELECT * FROM transcriptions WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);

    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    const summary = await summarizeTranscript(transcription.transcript, transcription.audio_language);

    db.prepare('UPDATE transcriptions SET summary = ? WHERE id = ?').run(summary, transcription.id);

    res.json({
      id: transcription.id,
      summary,
    });
  } catch (err) {
    console.error('Summarization error:', err);
    res.status(500).json({ error: err.message || 'Summarization failed' });
  }
});

// GET /api/transcriptions — list user's transcriptions
router.get('/', (req, res) => {
  try {
    const transcriptions = db.prepare(
      `SELECT id, title, audio_language, file_size,
              CASE WHEN summary IS NOT NULL THEN 1 ELSE 0 END as has_summary,
              created_at
       FROM transcriptions
       WHERE user_id = ?
       ORDER BY created_at DESC`
    ).all(req.userId);

    res.json(transcriptions);
  } catch (err) {
    console.error('List transcriptions error:', err);
    res.status(500).json({ error: 'Failed to list transcriptions' });
  }
});

// GET /api/transcriptions/:id — get single transcription with full text
router.get('/:id', (req, res) => {
  try {
    const transcription = db.prepare(
      'SELECT * FROM transcriptions WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);

    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    res.json(transcription);
  } catch (err) {
    console.error('Get transcription error:', err);
    res.status(500).json({ error: 'Failed to get transcription' });
  }
});

// DELETE /api/transcriptions/:id — delete a transcription
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM transcriptions WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    res.json({ message: 'Transcription deleted' });
  } catch (err) {
    console.error('Delete transcription error:', err);
    res.status(500).json({ error: 'Failed to delete transcription' });
  }
});

export default router;
