export const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

export function chunkFile(file) {
  if (file.size <= CHUNK_SIZE) {
    return [file];
  }
  const chunks = [];
  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    chunks.push(file.slice(offset, end));
    offset = end;
  }
  return chunks;
}
