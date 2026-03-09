# Class Transcription Web App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a static web app that transcribes Portuguese/English class recordings via Groq Whisper and summarizes them via Groq Llama 3, with provider abstraction for future upgrades.

**Architecture:** Single-page vanilla HTML/CSS/JS app. All API calls from the browser. Provider interfaces abstract transcription and summarization so backends can be swapped. localStorage for persistence. No build step — just static files served directly.

**Tech Stack:** Vanilla JS (ES modules), HTML5, CSS3, Groq API (Whisper + Llama 3), Node.js test runner for unit tests.

---

### Task 1: Project Scaffolding + Test Setup

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `js/app.js`
- Create: `package.json`

**Step 1: Create package.json with test runner**

```json
{
  "name": "class-transcriber",
  "version": "0.1.0",
  "private": true,
  "description": "Transcribe class recordings using Groq Whisper API",
  "scripts": {
    "test": "node --test js/**/*.test.js",
    "serve": "npx serve ."
  }
}
```

**Step 2: Create minimal index.html**

Create `index.html` with:
- HTML5 boilerplate, `lang="en"`, UTF-8
- Link to `css/styles.css`
- A `<div id="app">` container
- Script tags loading JS modules (type="module"): `js/i18n.js`, `js/storage.js`, `js/utils.js`, `js/audio-chunker.js`, `js/providers/transcription.js`, `js/providers/summarization.js`, `js/app.js`
- Basic structure: header (app title + language toggle + settings gear), main content area (upload zone, transcript area, summary area), settings modal, history sidebar

**Step 3: Create minimal css/styles.css**

Start with CSS reset, CSS custom properties for theming, and basic layout (centered container, max-width 900px). Just enough to not look broken.

**Step 4: Create empty js/app.js**

```javascript
// App initialization - will be populated in later tasks
console.log('Class Transcriber loaded');
```

**Step 5: Verify it loads**

Run: `npx serve . &` then open http://localhost:3000 (or just open index.html in browser).
Expected: Page loads with basic structure, console shows "Class Transcriber loaded".

**Step 6: Commit**

```bash
git add package.json index.html css/styles.css js/app.js
git commit -m "feat: scaffold project with HTML shell, CSS base, and test setup"
```

---

### Task 2: i18n Module

**Files:**
- Create: `js/i18n.js`
- Create: `js/i18n.test.js`

**Step 1: Write the failing test**

Create `js/i18n.test.js`:

```javascript
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
```

**Step 2: Run test to verify it fails**

Run: `node --test js/i18n.test.js`
Expected: FAIL — module not found or function not defined.

**Step 3: Write implementation**

Create `js/i18n.js`:

The translations object should cover these keys (at minimum):
- `app.title` — "Class Transcriber" / "Transcritor de Aulas"
- `app.subtitle` — "Upload your class recording to get a transcription" / "Envie a gravação da sua aula para obter a transcrição"
- `upload.title` — "Upload Audio" / "Enviar Áudio"
- `upload.dragDrop` — "Drag & drop your audio file here" / "Arraste e solte seu arquivo de áudio aqui"
- `upload.browse` — "Browse files" / "Procurar arquivos"
- `upload.formats` — "Supported: MP3, M4A, WAV, OGG, WebM" / "Formatos: MP3, M4A, WAV, OGG, WebM"
- `transcript.title` — "Transcription" / "Transcrição"
- `transcript.copy` — "Copy" / "Copiar"
- `transcript.download` — "Download" / "Baixar"
- `transcript.empty` — "Your transcription will appear here" / "Sua transcrição aparecerá aqui"
- `summary.title` — "Summary" / "Resumo"
- `summary.generate` — "Generate Summary" / "Gerar Resumo"
- `summary.copy` — "Copy" / "Copiar"
- `summary.download` — "Download" / "Baixar"
- `settings.title` — "Settings" / "Configurações"
- `settings.apiKey` — "Groq API Key" / "Chave API do Groq"
- `settings.apiKeyPlaceholder` — "Enter your Groq API key" / "Digite sua chave API do Groq"
- `settings.save` — "Save" / "Salvar"
- `settings.language` — "Audio Language" / "Idioma do Áudio"
- `history.title` — "History" / "Histórico"
- `history.empty` — "No transcriptions yet" / "Nenhuma transcrição ainda"
- `progress.transcribing` — "Transcribing..." / "Transcrevendo..."
- `progress.chunk` — "Processing chunk {current} of {total}" / "Processando parte {current} de {total}"
- `progress.summarizing` — "Generating summary..." / "Gerando resumo..."
- `error.noApiKey` — "Please set your Groq API key in settings" / "Por favor, configure sua chave API do Groq nas configurações"
- `error.uploadFailed` — "Upload failed. Please try again." / "Falha no envio. Por favor, tente novamente."
- `error.transcriptionFailed` — "Transcription failed" / "Falha na transcrição"

Export `createI18n(language = 'en')` which returns `{ t(key), setLanguage(lang), getLanguage() }`.
The `t()` function resolves dot-notation keys against the current language's translations object. If a key is not found, return the key itself.

**Step 4: Run test to verify it passes**

Run: `node --test js/i18n.test.js`
Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add js/i18n.js js/i18n.test.js
git commit -m "feat: add i18n module with English and Portuguese translations"
```

---

### Task 3: Storage Module

**Files:**
- Create: `js/storage.js`
- Create: `js/storage.test.js`

**Step 1: Write the failing test**

Create `js/storage.test.js`. Since `localStorage` doesn't exist in Node.js, create a mock at the top:

```javascript
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

const { saveSettings, loadSettings, saveTranscription, getHistory, deleteHistoryItem } = await import('./storage.js');

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
});
```

**Step 2: Run test to verify it fails**

Run: `node --test js/storage.test.js`
Expected: FAIL — module has no exports.

**Step 3: Write implementation**

Create `js/storage.js`:

- `SETTINGS_KEY = 'transcriber_settings'`
- `HISTORY_KEY = 'transcriber_history'`
- `DEFAULT_SETTINGS = { groqApiKey: '', uiLanguage: 'en', audioLanguage: 'pt' }`
- `loadSettings()` — parse from localStorage, merge with defaults (so new fields get defaults)
- `saveSettings(settings)` — JSON.stringify to localStorage
- `saveTranscription({ title, transcript, summary, date })` — generate ID via `Date.now().toString(36)`, prepend to history array, save. Most recent first.
- `getHistory()` — parse from localStorage, return array
- `deleteHistoryItem(id)` — filter out by id, save back

**Step 4: Run tests to verify they pass**

Run: `node --test js/storage.test.js`
Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add js/storage.js js/storage.test.js
git commit -m "feat: add storage module for settings and transcription history"
```

---

### Task 4: Audio Chunker Module

**Files:**
- Create: `js/audio-chunker.js`
- Create: `js/audio-chunker.test.js`

**Step 1: Write the failing test**

Create `js/audio-chunker.test.js`:

```javascript
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
```

**Step 2: Run test to verify it fails**

Run: `node --test js/audio-chunker.test.js`
Expected: FAIL.

**Step 3: Write implementation**

Create `js/audio-chunker.js`:

```javascript
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
```

**Step 4: Run tests to verify they pass**

Run: `node --test js/audio-chunker.test.js`
Expected: All 4 tests PASS.

**Step 5: Commit**

```bash
git add js/audio-chunker.js js/audio-chunker.test.js
git commit -m "feat: add audio chunker for splitting large files into 20MB chunks"
```

---

### Task 5: Transcription Provider

**Files:**
- Create: `js/providers/transcription.js`
- Create: `js/providers/transcription.test.js`

**Step 1: Write the failing test**

Create `js/providers/transcription.test.js`:

```javascript
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

  it('builds correct FormData for API call', () => {
    const provider = new GroqWhisperProvider('test-key');
    // Test the request building (not the actual API call)
    const config = provider.buildRequestConfig(new Blob(['test']), 'pt');
    assert.equal(config.language, 'pt');
    assert.equal(config.model, 'whisper-large-v3');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test js/providers/transcription.test.js`
Expected: FAIL.

**Step 3: Write implementation**

Create `js/providers/transcription.js`:

```javascript
export class GroqWhisperProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'whisper-large-v3';
    this.baseUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
  }

  buildRequestConfig(audioBlob, language) {
    return { model: this.model, language };
  }

  async transcribe(audioBlob, language = 'pt', fileName = 'audio.mp3') {
    const formData = new FormData();
    formData.append('file', audioBlob, fileName);
    formData.append('model', this.model);
    formData.append('language', language);
    formData.append('response_format', 'text');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transcription failed (${response.status}): ${error}`);
    }

    return response.text();
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test js/providers/transcription.test.js`
Expected: All 4 tests PASS. (Note: `Blob` and `FormData` are available in Node 20.)

**Step 5: Commit**

```bash
git add js/providers/transcription.js js/providers/transcription.test.js
git commit -m "feat: add Groq Whisper transcription provider"
```

---

### Task 6: Summarization Provider

**Files:**
- Create: `js/providers/summarization.js`
- Create: `js/providers/summarization.test.js`

**Step 1: Write the failing test**

Create `js/providers/summarization.test.js`:

```javascript
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
```

**Step 2: Run test to verify it fails**

Run: `node --test js/providers/summarization.test.js`
Expected: FAIL.

**Step 3: Write implementation**

Create `js/providers/summarization.js`:

```javascript
export class GroqLlamaProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'llama-3.3-70b-versatile';
    this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  }

  buildPrompt(transcript, language = 'pt') {
    if (language === 'pt') {
      return `Você é um assistente que resume aulas universitárias. Dado o texto transcrito de uma aula, gere um resumo conciso com os pontos principais em português.

Formato do resumo:
- Título/tema da aula (se identificável)
- 5-10 pontos principais em tópicos
- Conceitos-chave mencionados
- Qualquer tarefa ou leitura mencionada

Transcrição da aula:
${transcript}`;
    }
    return `You are an assistant that summarizes university lectures. Given the transcribed text of a lecture, generate a concise summary with key points in English.

Summary format:
- Lecture title/topic (if identifiable)
- 5-10 key points as bullet points
- Key concepts mentioned
- Any assignments or readings mentioned

Lecture transcript:
${transcript}`;
  }

  async summarize(transcript, language = 'pt') {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'user', content: this.buildPrompt(transcript, language) }
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Summarization failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test js/providers/summarization.test.js`
Expected: All 4 tests PASS.

**Step 5: Commit**

```bash
git add js/providers/summarization.js js/providers/summarization.test.js
git commit -m "feat: add Groq Llama summarization provider"
```

---

### Task 7: Utility Functions

**Files:**
- Create: `js/utils.js`
- Create: `js/utils.test.js`

**Step 1: Write the failing test**

Create `js/utils.test.js`:

```javascript
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
```

**Step 2: Run test to verify it fails**

Run: `node --test js/utils.test.js`
Expected: FAIL.

**Step 3: Write implementation**

Create `js/utils.js`:

- `formatFileSize(bytes)` — human-readable size (B, KB, MB, GB)
- `formatDate(isoString)` — format as readable date
- `generateFileName(title, type)` — slugify title, append type and .txt
- `isAudioFile(file)` — check file.type starts with `audio/` or is `video/mp4`
- `downloadText(text, fileName)` — create blob, trigger download via anchor click (browser-only, not tested in Node)
- `copyToClipboard(text)` — navigator.clipboard.writeText (browser-only, not tested in Node)

**Step 4: Run tests to verify they pass**

Run: `node --test js/utils.test.js`
Expected: All 4 tests PASS.

**Step 5: Commit**

```bash
git add js/utils.js js/utils.test.js
git commit -m "feat: add utility functions for formatting, file validation, and downloads"
```

---

### Task 8: Full HTML + CSS UI

**Files:**
- Modify: `index.html` (complete rewrite)
- Modify: `css/styles.css` (complete rewrite)

This is the main UI task. No tests — this is visual/structural work verified by opening in a browser.

**Step 1: Build complete index.html**

The HTML should include:

1. **Header bar:** Logo/title, language toggle (EN/PT buttons), settings gear icon button
2. **Settings modal** (hidden by default):
   - Groq API key input (password type with show/hide toggle)
   - Audio language select (Portuguese / English)
   - Save button
   - Link to get a Groq API key: https://console.groq.com/keys
3. **Main content area:**
   - **Upload zone:** Large dashed-border area with drag-and-drop support. File input hidden behind a "Browse files" button. Shows accepted formats. Shows selected file name + size after selection.
   - **Progress section** (hidden by default): Progress bar, chunk status text, cancel button
   - **Transcript section** (hidden by default): Textarea or div with transcript text, copy button, download button, "Summarize" button
   - **Summary section** (hidden by default): Summary text area, copy button, download button
4. **History sidebar** (collapsible on mobile):
   - List of past transcriptions (title + date)
   - Click to load a past transcription
   - Delete button per item
   - "No transcriptions yet" empty state

All text content should use `data-i18n` attributes for dynamic translation, e.g., `<h1 data-i18n="app.title">Class Transcriber</h1>`.

**Step 2: Style with CSS**

Design goals:
- Clean, modern, minimal — white background, subtle shadows, rounded corners
- CSS custom properties for colors: `--primary: #6366f1` (indigo), `--primary-hover`, `--bg`, `--surface`, `--text`, `--text-secondary`, `--border`
- Responsive: single column on mobile, sidebar on desktop (>768px)
- Upload zone: large, centered, dashed border, hover/drag-over highlight
- Progress bar: indigo fill, animated
- Buttons: consistent style, primary (filled) and secondary (outlined) variants
- Settings modal: overlay + centered card
- History items: clickable cards with hover effect
- Transitions on interactive elements
- Good typography: system font stack, readable sizes

**Step 3: Verify in browser**

Open index.html in browser. Verify:
- Layout looks clean and centered
- Settings modal opens/closes
- Language toggle buttons are visible
- Upload zone is prominent
- History sidebar renders (empty state)
- Responsive on narrow viewport

**Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: build complete HTML structure and CSS styling"
```

---

### Task 9: App Logic — Wire Everything Together

**Files:**
- Modify: `js/app.js` (complete rewrite)

This is the main integration task. Wire up all modules to the DOM.

**Step 1: Write app.js**

Structure:

```javascript
import { createI18n } from './i18n.js';
import { loadSettings, saveSettings, saveTranscription, getHistory, deleteHistoryItem } from './storage.js';
import { chunkFile } from './audio-chunker.js';
import { GroqWhisperProvider } from './providers/transcription.js';
import { GroqLlamaProvider } from './providers/summarization.js';
import { formatFileSize, formatDate, generateFileName, isAudioFile, downloadText, copyToClipboard } from './utils.js';
```

App state:
```javascript
const state = {
  i18n: null,
  settings: null,
  selectedFile: null,
  currentTranscript: '',
  currentSummary: '',
  isTranscribing: false,
  isSummarizing: false,
};
```

Functions to implement:

1. `init()` — Load settings, create i18n, render UI text, render history, bind events. Called on DOMContentLoaded.

2. `updateUILanguage()` — Query all `[data-i18n]` elements, set textContent from `state.i18n.t(key)`. Also update placeholders via `data-i18n-placeholder`.

3. `bindEvents()` — Attach listeners:
   - Language toggle buttons → switch UI language, save setting
   - Settings gear → open modal
   - Settings save → save API key + language, close modal
   - Upload zone drag events (dragover, dragleave, drop) → highlight, handle file
   - File input change → handle file
   - Transcribe button → start transcription
   - Summarize button → start summarization
   - Copy/download buttons → clipboard/download
   - History items → load past transcription
   - History delete → remove item

4. `handleFileSelect(file)` — Validate audio type, show file info (name + size), enable transcribe button. Store in `state.selectedFile`.

5. `async startTranscription()` — Main flow:
   - Check API key exists, show error if not
   - Get chunks from `chunkFile(state.selectedFile)`
   - Show progress section
   - Create `GroqWhisperProvider` with API key
   - Loop over chunks, transcribe each with 1-second delay between calls (rate limiting)
   - Update progress bar and chunk text per iteration
   - Concatenate results into `state.currentTranscript`
   - Show transcript section with result
   - Auto-save to history
   - Handle errors gracefully (show error message, don't crash)

6. `async startSummarization()` — Create `GroqLlamaProvider`, call summarize, show result, update history entry with summary.

7. `renderHistory()` — Clear and rebuild history list from `getHistory()`.

8. `loadHistoryItem(id)` — Find item in history, populate transcript + summary sections.

**Step 2: Verify full flow in browser**

Open app, set a Groq API key in settings, upload a short audio file, verify:
- File appears selected with name/size
- Transcription starts and progress updates
- Transcript text appears
- Summarize button works
- Copy/download work
- History updates
- Language toggle switches all UI text

**Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: wire up app logic connecting all modules to the UI"
```

---

### Task 10: Polish and Error Handling

**Files:**
- Modify: `js/app.js` — add error states, loading states, edge cases
- Modify: `css/styles.css` — error styles, loading animations
- Modify: `index.html` — any missing error/empty state elements

**Step 1: Add error handling**

- API key missing → show inline message with link to Groq console
- Invalid file type → show "Please upload an audio file" message
- Network error during transcription → show error, allow retry
- Rate limit hit → show "Rate limited, waiting..." message, auto-retry after delay
- Summarization failure → show error but keep transcript intact

**Step 2: Add loading states**

- Transcribe button → shows spinner during transcription, disabled
- Summarize button → shows spinner, disabled
- Upload zone → shows "Processing..." state during transcription

**Step 3: Add a cancel mechanism**

- AbortController for fetch calls
- Cancel button during transcription stops at current chunk
- Partial transcript still saved

**Step 4: Add nice touches**

- File size warning if > 200MB ("This is a large file, transcription may take a while")
- Auto-scroll to transcript section when done
- Toast/notification for copy success
- Keyboard shortcuts: Escape closes settings modal

**Step 5: Verify everything**

Test in browser:
- Upload with no API key → error message
- Upload non-audio file → rejection
- Upload small audio → full flow works
- Language toggle → all text switches
- History → items persist on refresh
- Copy → clipboard works
- Download → file downloads

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add error handling, loading states, and polish"
```

---

### Task 11: Run All Tests + Final Verification

**Step 1: Run full test suite**

Run: `node --test js/**/*.test.js`
Expected: All tests PASS.

**Step 2: Fix any failures**

If any tests broke during integration, fix them.

**Step 3: Manual smoke test**

Open the app in a browser, run through the complete flow:
1. Set API key
2. Upload a short audio clip
3. Transcribe
4. Summarize
5. Copy transcript
6. Download summary
7. Check history
8. Switch language
9. Load from history
10. Delete from history

**Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve test failures and final polish"
```

---

## Summary of Tasks

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Project scaffolding + test setup | None |
| 2 | i18n module | None |
| 3 | Storage module | None |
| 4 | Audio chunker module | None |
| 5 | Transcription provider | None |
| 6 | Summarization provider | None |
| 7 | Utility functions | None |
| 8 | Full HTML + CSS UI | Task 1 |
| 9 | App logic — wire everything | Tasks 2-8 |
| 10 | Polish and error handling | Task 9 |
| 11 | Final tests + verification | Task 10 |

**Tasks 2-7 are independent and can be parallelized.**
