import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatFileSize, formatDate, generateFileName, isAudioFile } from './utils.js';

describe('utils', () => {
  it('formats file sizes correctly', () => {
    assert.equal(formatFileSize(500), '500 B');
    assert.equal(formatFileSize(1024), '1.0 KB');
    assert.equal(formatFileSize(1048576), '1.0 MB');
    assert.equal(formatFileSize(1073741824), '1.0 GB');
  });

  it('formats dates', () => {
    const result = formatDate('2026-03-09');
    assert.ok(result.length > 0);
  });

  it('generates download file names', () => {
    const name = generateFileName('Math Class', 'transcript');
    assert.ok(name.includes('math-class'));
    assert.ok(name.includes('transcript'));
    assert.ok(name.endsWith('.txt'));
  });

  it('identifies audio files', () => {
    assert.equal(isAudioFile({ type: 'audio/mpeg' }), true);
    assert.equal(isAudioFile({ type: 'audio/wav' }), true);
    assert.equal(isAudioFile({ type: 'audio/ogg' }), true);
    assert.equal(isAudioFile({ type: 'audio/webm' }), true);
    assert.equal(isAudioFile({ type: 'audio/mp4' }), true);
    assert.equal(isAudioFile({ type: 'audio/x-m4a' }), true);
    assert.equal(isAudioFile({ type: 'video/mp4' }), true); // some recorders save as video/mp4
    assert.equal(isAudioFile({ type: 'text/plain' }), false);
    assert.equal(isAudioFile({ type: 'image/png' }), false);
  });
});
