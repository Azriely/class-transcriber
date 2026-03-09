import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createI18n } from './i18n.js';

describe('i18n', () => {
  it('returns English strings by default', () => {
    const i18n = createI18n();
    assert.equal(i18n.t('app.title'), 'Class Transcriber');
  });

  it('returns Portuguese strings when language is pt', () => {
    const i18n = createI18n('pt');
    assert.equal(i18n.t('app.title'), 'Transcritor de Aulas');
  });

  it('switches language', () => {
    const i18n = createI18n('en');
    assert.equal(i18n.t('app.title'), 'Class Transcriber');
    i18n.setLanguage('pt');
    assert.equal(i18n.t('app.title'), 'Transcritor de Aulas');
  });

  it('falls back to key if translation missing', () => {
    const i18n = createI18n('en');
    assert.equal(i18n.t('nonexistent.key'), 'nonexistent.key');
  });

  it('returns current language', () => {
    const i18n = createI18n('pt');
    assert.equal(i18n.getLanguage(), 'pt');
  });
});
