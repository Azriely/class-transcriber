import { createI18n } from './i18n.js';
import { loadSettings, saveSettings, saveTranscription, getHistory, deleteHistoryItem, updateHistoryItem } from './storage.js';
import { chunkFile } from './audio-chunker.js';
import { GroqWhisperProvider } from './providers/transcription.js';
import { GroqLlamaProvider } from './providers/summarization.js';
import { formatFileSize, formatDate, generateFileName, isAudioFile, downloadText, copyToClipboard } from './utils.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const state = {
  i18n: null,
  settings: null,
  selectedFile: null,
  currentTranscript: '',
  currentSummary: '',
  currentTitle: '',
  isTranscribing: false,
  isSummarizing: false,
  abortController: null,
};

// ── DOM References ──────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Toast ───────────────────────────────────────────────────────────

let toastTimer = null;

function showToast(message, type = '') {
  const toast = $('#toast');
  const toastMessage = $('#toast-message');
  toastMessage.textContent = message;
  toast.classList.remove('toast-success', 'toast-error');
  if (type) {
    toast.classList.add(type);
  }
  toast.removeAttribute('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.setAttribute('hidden', '');
  }, 3000);
}

// ── i18n UI Update ──────────────────────────────────────────────────

function updateUILanguage() {
  const { i18n } = state;
  $$('[data-i18n]').forEach(el => {
    el.textContent = i18n.t(el.getAttribute('data-i18n'));
  });
  $$('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', i18n.t(el.getAttribute('data-i18n-title')));
  });
  $$('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', i18n.t(el.getAttribute('data-i18n-placeholder')));
  });
  document.documentElement.lang = i18n.getLanguage();
  document.title = i18n.t('app.title');
}

// ── File Handling ───────────────────────────────────────────────────

function handleFileSelect(file) {
  if (!isAudioFile(file)) {
    showToast(state.i18n.t('error.uploadFailed'), 'toast-error');
    return;
  }
  state.selectedFile = file;
  const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
  state.currentTitle = nameWithoutExt;

  $('#file-name').textContent = file.name;
  $('#file-size').textContent = formatFileSize(file.size);
  $('#upload-zone').setAttribute('hidden', '');
  $('#file-info').removeAttribute('hidden');

  // File size warning for large files (> 200MB)
  if (file.size > 200 * 1024 * 1024) {
    showToast('Large file detected. Transcription may take several minutes.', 'toast-error');
  }
}

function clearFile() {
  state.selectedFile = null;
  state.currentTitle = '';
  $('#file-input').value = '';
  $('#file-info').setAttribute('hidden', '');
  $('#transcribe-btn').removeAttribute('hidden');
  $('#upload-zone').removeAttribute('hidden');
}

// ── Transcription ───────────────────────────────────────────────────

async function transcribeChunkWithRetry(provider, chunk, language, fileName, chunkIndex, totalChunks) {
  const retryDelays = [2000, 5000, 10000];
  let lastError = null;

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      return await provider.transcribe(chunk, language, fileName);
    } catch (err) {
      lastError = err;
      const is429 = err.message && err.message.includes('(429)');
      if (is429 && attempt < retryDelays.length) {
        $('#progress-text').textContent = 'Rate limited, retrying...';
        await delay(retryDelays[attempt]);
        // Restore chunk progress text after retry wait
        $('#progress-text').textContent = state.i18n.t('progress.chunk')
          .replace('{current}', chunkIndex + 1)
          .replace('{total}', totalChunks);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function startTranscription() {
  if (!state.settings.groqApiKey) {
    showToast('Please set your Groq API key in Settings', 'toast-error');
    openSettings();
    return;
  }

  const transcribeBtn = $('#transcribe-btn');
  transcribeBtn.disabled = true;
  transcribeBtn.textContent = 'Transcribing...';

  state.isTranscribing = true;
  state.abortController = new AbortController();

  // Disable upload zone during transcription
  $('#upload-zone').classList.add('disabled');

  $('#file-info').setAttribute('hidden', '');
  $('#progress-section').removeAttribute('hidden');
  $('#progress-fill').style.width = '0%';
  $('#progress-text').textContent = state.i18n.t('progress.transcribing');

  try {
    const chunks = chunkFile(state.selectedFile);
    const provider = new GroqWhisperProvider(state.settings.groqApiKey);
    const results = [];

    for (let i = 0; i < chunks.length; i++) {
      if (state.abortController.signal.aborted) break;

      const progressPct = Math.round(((i + 1) / chunks.length) * 100);
      $('#progress-fill').style.width = `${progressPct}%`;
      $('#progress-text').textContent = state.i18n.t('progress.chunk')
        .replace('{current}', i + 1)
        .replace('{total}', chunks.length);

      const text = await transcribeChunkWithRetry(
        provider,
        chunks[i],
        state.settings.audioLanguage,
        state.selectedFile.name,
        i,
        chunks.length,
      );
      results.push(text);

      if (i < chunks.length - 1) {
        await delay(1500);
      }
    }

    if (state.abortController.signal.aborted) {
      restoreUploadUI();
      return;
    }

    state.currentTranscript = results.join(' ');
    state.currentSummary = '';

    // Check for empty transcription
    if (!state.currentTranscript.trim()) {
      showToast('No speech detected in audio', 'toast-error');
      restoreUploadUI();
      return;
    }

    $('#progress-section').setAttribute('hidden', '');
    $('#transcript-section').removeAttribute('hidden');
    $('#transcript-text').textContent = state.currentTranscript;
    $('#summary-section').setAttribute('hidden', '');

    saveTranscription({
      title: state.currentTitle,
      transcript: state.currentTranscript,
      summary: '',
      date: new Date().toISOString(),
    });
    renderHistory();

    // Auto-scroll to transcript section
    $('#transcript-section').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    if (!state.abortController.signal.aborted) {
      const statusMatch = err.message && err.message.match(/\((\d+)\)/);
      const statusInfo = statusMatch ? ` (HTTP ${statusMatch[1]})` : '';
      showToast(`${state.i18n.t('error.transcriptionFailed')}${statusInfo}: ${err.message}`, 'toast-error');
    }
    restoreUploadUI();
  } finally {
    state.isTranscribing = false;
    state.abortController = null;
    transcribeBtn.disabled = false;
    transcribeBtn.textContent = state.i18n.t('upload.title');
    $('#upload-zone').classList.remove('disabled');
  }
}

function restoreUploadUI() {
  $('#progress-section').setAttribute('hidden', '');
  if (state.selectedFile) {
    $('#file-info').removeAttribute('hidden');
  } else {
    $('#upload-zone').removeAttribute('hidden');
  }
}

function cancelTranscription() {
  if (state.abortController) {
    state.abortController.abort();
  }
}

// ── Summarization ───────────────────────────────────────────────────

async function startSummarization() {
  if (!state.settings.groqApiKey) {
    showToast('Please set your Groq API key in Settings', 'toast-error');
    openSettings();
    return;
  }

  const summarizeBtn = $('#summarize-btn');
  summarizeBtn.disabled = true;
  summarizeBtn.textContent = 'Generating...';
  state.isSummarizing = true;

  try {
    const provider = new GroqLlamaProvider(state.settings.groqApiKey);
    const summary = await provider.summarize(
      state.currentTranscript,
      state.settings.audioLanguage,
    );
    state.currentSummary = summary;

    $('#summary-section').removeAttribute('hidden');
    $('#summary-text').textContent = summary;

    // Update the history entry with the summary using storage module
    const history = getHistory();
    const entry = history.find(h => h.title === state.currentTitle);
    if (entry) {
      updateHistoryItem(entry.id, { summary });
    }
  } catch (err) {
    // Keep transcript visible and intact if summarization fails
    showToast(err.message, 'toast-error');
  } finally {
    state.isSummarizing = false;
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = state.i18n.t('summary.generate');
  }
}

// ── History ─────────────────────────────────────────────────────────

function renderHistory() {
  const historyList = $('#history-list');
  const history = getHistory();

  historyList.innerHTML = '';

  if (history.length === 0) {
    const emptyP = document.createElement('p');
    emptyP.className = 'history-empty';
    emptyP.setAttribute('data-i18n', 'history.empty');
    emptyP.textContent = state.i18n.t('history.empty');
    historyList.appendChild(emptyP);
    return;
  }

  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.setAttribute('data-id', item.id);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'history-item-info';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'history-item-title';
    titleSpan.textContent = item.title;

    const dateSpan = document.createElement('span');
    dateSpan.className = 'history-item-date';
    dateSpan.textContent = formatDate(item.date);

    infoDiv.appendChild(titleSpan);
    infoDiv.appendChild(dateSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon-sm btn-delete';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>`;

    div.appendChild(infoDiv);
    div.appendChild(deleteBtn);
    historyList.appendChild(div);
  });
}

function loadHistoryItem(id) {
  const history = getHistory();
  const item = history.find(h => h.id === id);
  if (!item) return;

  state.currentTranscript = item.transcript;
  state.currentSummary = item.summary || '';
  state.currentTitle = item.title;
  state.selectedFile = null;

  $('#upload-zone').setAttribute('hidden', '');
  $('#progress-section').setAttribute('hidden', '');

  // Show file info with the history item's title
  $('#file-name').textContent = item.title;
  $('#file-size').textContent = formatDate(item.date);
  $('#file-info').removeAttribute('hidden');
  // Hide transcribe button since this is already transcribed
  $('#transcribe-btn').setAttribute('hidden', '');

  $('#transcript-section').removeAttribute('hidden');
  $('#transcript-text').textContent = item.transcript;

  if (item.summary) {
    $('#summary-section').removeAttribute('hidden');
    $('#summary-text').textContent = item.summary;
  } else {
    $('#summary-section').setAttribute('hidden', '');
  }

  $('#transcript-section').scrollIntoView({ behavior: 'smooth' });
}

// ── Settings Modal ──────────────────────────────────────────────────

function openSettings() {
  const modal = $('#settings-modal');
  $('#api-key-input').value = state.settings.groqApiKey || '';
  $('#audio-lang-select').value = state.settings.audioLanguage || 'pt';
  modal.removeAttribute('hidden');
}

function closeSettings() {
  $('#settings-modal').setAttribute('hidden', '');
  // Reset API key field to password type when closing
  $('#api-key-input').type = 'password';
}

function handleSaveSettings() {
  state.settings.groqApiKey = $('#api-key-input').value.trim();
  state.settings.audioLanguage = $('#audio-lang-select').value;
  saveSettings(state.settings);
  closeSettings();
  showToast(state.i18n.t('settings.save'), 'toast-success');
}

function toggleApiKeyVisibility() {
  const input = $('#api-key-input');
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ── Event Binding ───────────────────────────────────────────────────

function bindEvents() {
  // Language toggle
  $$('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      state.i18n.setLanguage(lang);
      state.settings.uiLanguage = lang;
      saveSettings(state.settings);
      $$('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateUILanguage();
    });
  });

  // Settings
  $('#settings-btn').addEventListener('click', openSettings);
  $('#settings-close').addEventListener('click', closeSettings);
  $('#settings-modal .modal-overlay').addEventListener('click', closeSettings);
  $('#toggle-api-key').addEventListener('click', toggleApiKeyVisibility);
  $('#settings-save-btn').addEventListener('click', handleSaveSettings);

  // Upload zone drag & drop
  const uploadZone = $('#upload-zone');
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });
  uploadZone.addEventListener('click', (e) => {
    // Don't trigger if they clicked the browse button (it has its own handler)
    if (e.target.id !== 'browse-btn' && !e.target.closest('#browse-btn')) {
      $('#file-input').click();
    }
  });

  // Browse button
  $('#browse-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#file-input').click();
  });

  // File input
  $('#file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  });

  // Transcribe
  $('#transcribe-btn').addEventListener('click', startTranscription);

  // Remove file
  $('#remove-file-btn').addEventListener('click', clearFile);

  // Cancel transcription
  $('#cancel-btn').addEventListener('click', cancelTranscription);

  // Summarize
  $('#summarize-btn').addEventListener('click', startSummarization);

  // Copy / Download — Transcript
  $('#copy-transcript-btn').addEventListener('click', async () => {
    try {
      await copyToClipboard(state.currentTranscript);
      showToast('Copied!', 'toast-success');
    } catch {
      showToast('Copy failed', 'toast-error');
    }
  });
  $('#download-transcript-btn').addEventListener('click', () => {
    const fileName = generateFileName(state.currentTitle, 'transcript');
    downloadText(state.currentTranscript, fileName);
  });

  // Copy / Download — Summary
  $('#copy-summary-btn').addEventListener('click', async () => {
    try {
      await copyToClipboard(state.currentSummary);
      showToast('Copied!', 'toast-success');
    } catch {
      showToast('Copy failed', 'toast-error');
    }
  });
  $('#download-summary-btn').addEventListener('click', () => {
    const fileName = generateFileName(state.currentTitle, 'summary');
    downloadText(state.currentSummary, fileName);
  });

  // History — event delegation
  $('#history-list').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete');
    if (deleteBtn) {
      e.stopPropagation();
      const item = deleteBtn.closest('.history-item');
      if (item) {
        deleteHistoryItem(item.getAttribute('data-id'));
        renderHistory();
      }
      return;
    }
    const historyItem = e.target.closest('.history-item');
    if (historyItem) {
      loadHistoryItem(historyItem.getAttribute('data-id'));
    }
  });

  // Escape key — close settings modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = $('#settings-modal');
      if (!modal.hasAttribute('hidden')) {
        closeSettings();
      }
    }
  });
}

// ── Initialization ──────────────────────────────────────────────────

function init() {
  state.settings = loadSettings();
  state.i18n = createI18n(state.settings.uiLanguage);

  updateUILanguage();

  // Set active language toggle
  $$('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === state.settings.uiLanguage);
  });

  // Populate settings modal with saved values
  $('#api-key-input').value = state.settings.groqApiKey || '';
  $('#audio-lang-select').value = state.settings.audioLanguage || 'pt';

  renderHistory();
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
