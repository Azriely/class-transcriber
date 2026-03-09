const SETTINGS_KEY = 'transcriber_settings';
const HISTORY_KEY = 'transcriber_history';
const DEFAULT_SETTINGS = { groqApiKey: '', uiLanguage: 'en', audioLanguage: 'pt' };
let idCounter = 0;

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTranscription({ title, transcript, summary, date }) {
  const history = getHistory();
  const id = Date.now().toString(36) + '-' + (idCounter++);
  history.unshift({ id, title, transcript, summary, date });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function deleteHistoryItem(id) {
  const history = getHistory().filter(item => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
