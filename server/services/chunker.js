import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Preprocess audio: normalize volume and apply light noise reduction.
 * Returns path to the preprocessed file (or original if preprocessing fails).
 */
export function preprocessAudio(filePath, originalName = 'audio.mp3') {
  const ext = originalName.match(/\.[^.]+$/)?.[0] || '.mp3';
  const outPath = path.join(os.tmpdir(), `preproc-${Date.now()}${ext}`);

  try {
    // Two-pass loudnorm for proper normalization + highpass to cut low rumble
    execSync(
      `ffmpeg -v error -i "${filePath}" -af "highpass=f=80,lowpass=f=8000,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 16000 -ac 1 "${outPath}"`,
      { encoding: 'utf-8', timeout: 120000 }
    );

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
      return outPath;
    }
  } catch (err) {
    console.warn('Audio preprocessing failed, using original:', err.message);
    try { fs.unlinkSync(outPath); } catch {}
  }

  return filePath;
}

/**
 * Split an audio file into chunks that the Whisper API can handle.
 * Uses ffmpeg to properly split container formats (m4a, mp4, etc.)
 * so each chunk is a valid, self-contained audio file.
 */
export function chunkAudioFile(filePath, originalName = 'audio.mp3') {
  const stats = fs.statSync(filePath);
  if (stats.size <= CHUNK_SIZE) return [filePath];

  const ext = originalName.match(/\.[^.]+$/)?.[0] || '.mp3';
  const tmpDir = os.tmpdir();
  const sessionId = Date.now();

  // Get audio duration in seconds
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { encoding: 'utf-8' }
  ).trim();
  const totalDuration = parseFloat(durationStr);

  if (!totalDuration || isNaN(totalDuration)) {
    // Can't determine duration — return as-is and let the API handle it
    return [filePath];
  }

  // Estimate number of chunks needed based on file size
  const numChunks = Math.ceil(stats.size / CHUNK_SIZE);
  const segmentDuration = Math.ceil(totalDuration / numChunks);

  const chunks = [];
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * segmentDuration;
    if (startTime >= totalDuration) break;

    const chunkPath = path.join(tmpDir, `chunk-${sessionId}-${i}${ext}`);

    execSync(
      `ffmpeg -v error -i "${filePath}" -ss ${startTime} -t ${segmentDuration} -c copy "${chunkPath}"`,
      { encoding: 'utf-8' }
    );

    // Verify the chunk was created and has content
    if (fs.existsSync(chunkPath) && fs.statSync(chunkPath).size > 0) {
      chunks.push(chunkPath);
    }
  }

  // Fallback: if ffmpeg splitting failed, return original file
  if (chunks.length === 0) return [filePath];

  return chunks;
}

export function cleanupChunks(chunkPaths, originalPath) {
  for (const p of chunkPaths) {
    if (p !== originalPath) {
      try { fs.unlinkSync(p); } catch {}
    }
  }
}
