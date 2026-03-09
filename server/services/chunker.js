import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

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
