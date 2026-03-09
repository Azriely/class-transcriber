import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GroqLlamaProvider } from './summarization.js';

describe('GroqLlamaProvider', () => {
  it('constructs with API key', () => {
    const provider = new GroqLlamaProvider('test-key');
    assert.ok(provider);
  });

  it('has a summarize method', () => {
    const provider = new GroqLlamaProvider('test-key');
    assert.equal(typeof provider.summarize, 'function');
  });

  it('builds correct prompt for Portuguese', () => {
    const provider = new GroqLlamaProvider('test-key');
    const prompt = provider.buildPrompt('Some transcript text', 'pt');
    assert.ok(prompt.includes('Some transcript text'));
    assert.ok(prompt.includes('português') || prompt.includes('Portuguese'));
  });

  it('builds correct prompt for English', () => {
    const provider = new GroqLlamaProvider('test-key');
    const prompt = provider.buildPrompt('Some transcript text', 'en');
    assert.ok(prompt.includes('Some transcript text'));
    assert.ok(prompt.includes('English') || prompt.includes('inglês'));
  });
});
