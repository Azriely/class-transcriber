const translations = {
  en: {
    app: {
      title: 'Class Transcriber',
      subtitle: 'Upload your class recording to get a transcription',
    },
    upload: {
      title: 'Upload Audio',
      dragDrop: 'Drag & drop your audio file here',
      or: 'or',
      browse: 'Browse files',
      formats: 'Supported: MP3, M4A, WAV, OGG, WebM',
      remove: 'Remove',
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
      apiKeyHelp: 'Get a free API key at',
      save: 'Save',
      saved: 'Settings saved',
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
      cancel: 'Cancel',
      generating: 'Generating...',
    },
    error: {
      noApiKey: 'Please set your Groq API key in settings',
      uploadFailed: 'Upload failed. Please try again.',
      transcriptionFailed: 'Transcription failed',
      largeFile: 'Large file detected. Transcription may take several minutes.',
      rateLimited: 'Rate limited, retrying...',
      noSpeech: 'No speech detected in audio',
      copyFailed: 'Copy failed',
    },
    success: {
      copied: 'Copied!',
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
      or: 'ou',
      browse: 'Procurar arquivos',
      formats: 'Formatos: MP3, M4A, WAV, OGG, WebM',
      remove: 'Remover',
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
      apiKeyHelp: 'Obtenha uma chave API gratuita em',
      save: 'Salvar',
      saved: 'Configurações salvas',
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
      cancel: 'Cancelar',
      generating: 'Gerando...',
    },
    error: {
      noApiKey: 'Por favor, configure sua chave API do Groq nas configurações',
      uploadFailed: 'Falha no envio. Por favor, tente novamente.',
      transcriptionFailed: 'Falha na transcrição',
      largeFile: 'Arquivo grande detectado. A transcrição pode levar vários minutos.',
      rateLimited: 'Limite de requisições atingido, tentando novamente...',
      noSpeech: 'Nenhuma fala detectada no áudio',
      copyFailed: 'Falha ao copiar',
    },
    success: {
      copied: 'Copiado!',
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
