import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node.js
const storage = {};
globalThis.localStorage = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = String(value); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (const key in storage) delete storage[key]; }
};

const { saveSettings, loadSettings, saveTranscription, getHistory, deleteHistoryItem, updateHistoryItem } = await import('./storage.js');

describe('storage - settings', () => {
  beforeEach(() => localStorage.clear());

  it('returns default settings when nothing saved', () => {
    const settings = loadSettings();
    assert.equal(settings.groqApiKey, '');
    assert.equal(settings.uiLanguage, 'en');
    assert.equal(settings.audioLanguage, 'pt');
  });

  it('saves and loads settings', () => {
    saveSettings({ groqApiKey: 'test-key-123', uiLanguage: 'pt', audioLanguage: 'en' });
    const settings = loadSettings();
    assert.equal(settings.groqApiKey, 'test-key-123');
    assert.equal(settings.uiLanguage, 'pt');
    assert.equal(settings.audioLanguage, 'en');
  });
});

describe('storage - history', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty array when no history', () => {
    const history = getHistory();
    assert.deepEqual(history, []);
  });

  it('saves a transcription and retrieves it', () => {
    saveTranscription({ title: 'Math Class', transcript: 'Hello world', summary: '', date: '2026-03-09' });
    const history = getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].title, 'Math Class');
    assert.equal(history[0].transcript, 'Hello world');
  });

  it('assigns unique IDs', () => {
    saveTranscription({ title: 'Class 1', transcript: 'a', summary: '', date: '2026-03-09' });
    saveTranscription({ title: 'Class 2', transcript: 'b', summary: '', date: '2026-03-10' });
    const history = getHistory();
    assert.equal(history.length, 2);
    assert.notEqual(history[0].id, history[1].id);
  });

  it('deletes a history item by id', () => {
    saveTranscription({ title: 'Class 1', transcript: 'a', summary: '', date: '2026-03-09' });
    const history = getHistory();
    deleteHistoryItem(history[0].id);
    assert.deepEqual(getHistory(), []);
  });

  it('updates a history item by id', () => {
    saveTranscription({ title: 'Class 1', transcript: 'a', summary: '', date: '2026-03-09' });
    const history = getHistory();
    updateHistoryItem(history[0].id, { summary: 'A summary' });
    const updated = getHistory();
    assert.equal(updated[0].summary, 'A summary');
    assert.equal(updated[0].title, 'Class 1');
    assert.equal(updated[0].transcript, 'a');
  });

  it('does nothing when updating non-existent id', () => {
    saveTranscription({ title: 'Class 1', transcript: 'a', summary: '', date: '2026-03-09' });
    updateHistoryItem('non-existent', { summary: 'fail' });
    const history = getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].summary, '');
  });
});
