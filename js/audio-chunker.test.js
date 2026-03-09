import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chunkFile, CHUNK_SIZE } from './audio-chunker.js';

// Mock File/Blob for Node.js
class MockFile {
  constructor(size, name = 'test.mp3', type = 'audio/mpeg') {
    this.size = size;
    this.name = name;
    this.type = type;
    this._data = Buffer.alloc(size);
  }
  slice(start, end) {
    const sliced = new MockFile(end - start, this.name, this.type);
    sliced._data = this._data.subarray(start, end);
    return sliced;
  }
}

describe('audio chunker', () => {
  it('returns single chunk for small files', () => {
    const file = new MockFile(1024 * 1024); // 1MB
    const chunks = chunkFile(file);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].size, 1024 * 1024);
  });

  it('splits large files into chunks under CHUNK_SIZE', () => {
    const file = new MockFile(50 * 1024 * 1024); // 50MB
    const chunks = chunkFile(file);
    assert.ok(chunks.length > 1);
    for (const chunk of chunks) {
      assert.ok(chunk.size <= CHUNK_SIZE);
    }
  });

  it('preserves total size across chunks', () => {
    const totalSize = 50 * 1024 * 1024;
    const file = new MockFile(totalSize);
    const chunks = chunkFile(file);
    const sum = chunks.reduce((acc, c) => acc + c.size, 0);
    assert.equal(sum, totalSize);
  });

  it('exports CHUNK_SIZE as 20MB', () => {
    assert.equal(CHUNK_SIZE, 20 * 1024 * 1024);
  });
});
