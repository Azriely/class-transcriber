const translations = {
  en: {
    app: {
      title: 'Class Transcriber',
      subtitle: 'Upload your class recording to get a transcription',
    },
    upload: {
      title: 'Upload Audio',
      dragDrop: 'Drag & drop your audio file here',
      browse: 'Browse files',
      formats: 'Supported: MP3, M4A, WAV, OGG, WebM',
    },
    transcript: {
      title: 'Transcription',
      copy: 'Copy',
      download: 'Download',
      empty: 'Your transcription will appear here',
    },
    summary: {
      title: 'Summary',
      generate: 'Generate Summary',
      copy: 'Copy',
      download: 'Download',
    },
    settings: {
      title: 'Settings',
      apiKey: 'Groq API Key',
      apiKeyPlaceholder: 'Enter your Groq API key',
      save: 'Save',
      language: 'Audio Language',
    },
    history: {
      title: 'History',
      empty: 'No transcriptions yet',
    },
    progress: {
      transcribing: 'Transcribing...',
      chunk: 'Processing chunk {current} of {total}',
      summarizing: 'Generating summary...',
    },
    error: {
      noApiKey: 'Please set your Groq API key in settings',
      uploadFailed: 'Upload failed. Please try again.',
      transcriptionFailed: 'Transcription failed',
    },
  },
  pt: {
    app: {
      title: 'Transcritor de Aulas',
      subtitle: 'Envie a gravação da sua aula para obter a transcrição',
    },
    upload: {
      title: 'Enviar Áudio',
      dragDrop: 'Arraste e solte seu arquivo de áudio aqui',
      browse: 'Procurar arquivos',
      formats: 'Formatos: MP3, M4A, WAV, OGG, WebM',
    },
    transcript: {
      title: 'Transcrição',
      copy: 'Copiar',
      download: 'Baixar',
      empty: 'Sua transcrição aparecerá aqui',
    },
    summary: {
      title: 'Resumo',
      generate: 'Gerar Resumo',
      copy: 'Copiar',
      download: 'Baixar',
    },
    settings: {
      title: 'Configurações',
      apiKey: 'Chave API do Groq',
      apiKeyPlaceholder: 'Digite sua chave API do Groq',
      save: 'Salvar',
      language: 'Idioma do Áudio',
    },
    history: {
      title: 'Histórico',
      empty: 'Nenhuma transcrição ainda',
    },
    progress: {
      transcribing: 'Transcrevendo...',
      chunk: 'Processando parte {current} de {total}',
      summarizing: 'Gerando resumo...',
    },
    error: {
      noApiKey: 'Por favor, configure sua chave API do Groq nas configurações',
      uploadFailed: 'Falha no envio. Por favor, tente novamente.',
      transcriptionFailed: 'Falha na transcrição',
    },
  },
};

export function createI18n(language = 'en') {
  let currentLanguage = language;

  function t(key) {
    const parts = key.split('.');
    let value = translations[currentLanguage];
    for (const part of parts) {
      if (value == null || typeof value !== 'object') {
        return key;
      }
      value = value[part];
    }
    return value != null ? value : key;
  }

  function setLanguage(lang) {
    currentLanguage = lang;
  }

  function getLanguage() {
    return currentLanguage;
  }

  return { t, setLanguage, getLanguage };
}
