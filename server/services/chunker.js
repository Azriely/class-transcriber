import fs from 'fs';
import path from 'path';
import os from 'os';

const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

export function chunkAudioFile(filePath) {
  const stats = fs.statSync(filePath);
  if (stats.size <= CHUNK_SIZE) return [filePath];

  const chunks = [];
  const buffer = fs.readFileSync(filePath);
  let offset = 0;
  let i = 0;

  while (offset < buffer.length) {
    const end = Math.min(offset + CHUNK_SIZE, buffer.length);
    const chunkPath = path.join(os.tmpdir(), `chunk-${Date.now()}-${i}.mp3`);
    fs.writeFileSync(chunkPath, buffer.subarray(offset, end));
    chunks.push(chunkPath);
    offset = end;
    i++;
  }
  return chunks;
}

export function cleanupChunks(chunkPaths, originalPath) {
  for (const p of chunkPaths) {
    if (p !== originalPath) {
      try { fs.unlinkSync(p); } catch {}
    }
  }
}
