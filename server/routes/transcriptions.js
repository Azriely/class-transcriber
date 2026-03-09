import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth.js';
import { transcribeAudio, summarizeTranscript } from '../services/groq.js';
import { chunkAudioFile, cleanupChunks } from '../services/chunker.js';
import db from '../db.js';

const router = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// In-memory job tracker for background transcription processing
const jobs = new Map();

// All routes require authentication
router.use(authenticate);

// POST /api/transcriptions/transcribe — upload audio, return job ID immediately
router.post('/transcribe', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const { title, language } = req.body;
  const audioLanguage = language || 'pt';
  const transcriptionTitle = title || req.file.originalname || 'Untitled';
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Copy uploaded file to a persistent temp location (multer may clean up)
  const persistPath = path.join(os.tmpdir(), `transcribe-${jobId}${path.extname(req.file.originalname || '.mp3')}`);
  fs.copyFileSync(req.file.path, persistPath);
  try { fs.unlinkSync(req.file.path); } catch {}

  // Create job
  jobs.set(jobId, {
    userId: req.userId,
    status: 'processing',
    progress: 5,
    message: 'Queued...',
    result: null,
    error: null,
  });

  // Return immediately
  res.status(202).json({ jobId });

  // Process in background
  processTranscription(jobId, persistPath, req.file.originalname, audioLanguage, transcriptionTitle, req.userId, req.file.size);
});

async function processTranscription(jobId, filePath, originalName, language, title, userId, fileSize) {
  let chunks = [];
  const job = jobs.get(jobId);

  try {
    job.message = 'Splitting audio...';
    job.progress = 10;

    chunks = chunkAudioFile(filePath, originalName);

    job.message = `Processing ${chunks.length} chunk(s)...`;

    const parts = [];
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      job.message = `Transcribing chunk ${i + 1} of ${chunks.length}...`;
      job.progress = 10 + Math.round((i / chunks.length) * 80);

      const text = await transcribeAudio(chunks[i], language, originalName, (msg) => {
        job.message = msg;
      });
      parts.push(text);
    }

    const fullTranscript = parts.join(' ');

    job.message = 'Saving...';
    job.progress = 95;

    const stmt = db.prepare(
      'INSERT INTO transcriptions (user_id, title, audio_language, transcript, file_size) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(userId, title, language, fullTranscript, fileSize);

    job.status = 'complete';
    job.progress = 100;
    job.message = 'Done';
    job.result = {
      id: Number(result.lastInsertRowid),
      title,
      transcript: fullTranscript,
    };
  } catch (err) {
    console.error('Transcription error:', err);
    job.status = 'error';
    job.error = err.message || 'Transcription failed';
    job.message = job.error;
  } finally {
    cleanupChunks(chunks, filePath);
    try { fs.unlinkSync(filePath); } catch {}

    // Clean up job from memory after 10 minutes
    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
  }
}

// GET /api/transcriptions/jobs/:jobId — poll for transcription job status
router.get('/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  // Only allow the job owner to check status
  if (job.userId !== req.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({
    status: job.status,
    progress: job.progress,
    message: job.message,
    result: job.result,
    error: job.error,
  });
});

// POST /api/transcriptions/:id/summarize — start summarization as background job
router.post('/:id/summarize', (req, res) => {
  const transcription = db.prepare(
    'SELECT * FROM transcriptions WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!transcription) {
    return res.status(404).json({ error: 'Transcription not found' });
  }

  const jobId = `sum-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  jobs.set(jobId, {
    userId: req.userId,
    status: 'processing',
    progress: 10,
    message: 'Generating summary...',
    result: null,
    error: null,
  });

  res.status(202).json({ jobId });

  // Process in background
  processSummarization(jobId, transcription);
});

async function processSummarization(jobId, transcription) {
  const job = jobs.get(jobId);
  try {
    job.message = 'Summarizing transcript...';
    job.progress = 30;

    const summary = await summarizeTranscript(transcription.transcript, transcription.audio_language);

    db.prepare('UPDATE transcriptions SET summary = ? WHERE id = ?').run(summary, transcription.id);

    job.status = 'complete';
    job.progress = 100;
    job.message = 'Done';
    job.result = { id: transcription.id, summary };
  } catch (err) {
    console.error('Summarization error:', err);
    job.status = 'error';
    job.error = err.message || 'Summarization failed';
    job.message = job.error;
  } finally {
    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
  }
}

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
