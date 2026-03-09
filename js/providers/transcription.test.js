import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GroqWhisperProvider } from './transcription.js';

describe('GroqWhisperProvider', () => {
  it('constructs with API key', () => {
    const provider = new GroqWhisperProvider('test-key');
    assert.ok(provider);
  });

  it('has a transcribe method', () => {
    const provider = new GroqWhisperProvider('test-key');
    assert.equal(typeof provider.transcribe, 'function');
  });

  it('has correct model name', () => {
    const provider = new GroqWhisperProvider('test-key');
    assert.equal(provider.model, 'whisper-large-v3');
  });

  it('builds correct request config', () => {
    const provider = new GroqWhisperProvider('test-key');
    const config = provider.buildRequestConfig(new Blob(['test']), 'pt');
    assert.equal(config.language, 'pt');
    assert.equal(config.model, 'whisper-large-v3');
  });
});
