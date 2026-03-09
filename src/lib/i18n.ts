export type Language = 'en' | 'pt';

export const translations = {
  // Auth
  login: { en: 'Login', pt: 'Entrar' },
  register: { en: 'Register', pt: 'Registrar' },
  email: { en: 'Email', pt: 'Email' },
  password: { en: 'Password', pt: 'Senha' },
  displayName: { en: 'Display Name', pt: 'Nome de Exibição' },
  loginTitle: { en: 'Sign In', pt: 'Iniciar Sessão' },
  registerTitle: { en: 'Create Account', pt: 'Criar Conta' },
  loginSubmit: { en: 'Sign In', pt: 'Entrar' },
  registerSubmit: { en: 'Create Account', pt: 'Criar Conta' },
  switchToRegister: {
    en: "Don't have an account? Register",
    pt: 'Não tem conta? Registre-se',
  },
  switchToLogin: {
    en: 'Already have an account? Sign in',
    pt: 'Já tem conta? Entre',
  },
  authError: { en: 'Authentication failed', pt: 'Falha na autenticação' },
  logout: { en: 'Logout', pt: 'Sair' },

  // Dashboard
  appTitle: { en: 'Class Transcriber', pt: 'Transcritor de Aulas' },
  uploadTitle: { en: 'Upload Audio', pt: 'Enviar Áudio' },
  uploadDescription: {
    en: 'Upload an audio file to transcribe',
    pt: 'Envie um arquivo de áudio para transcrever',
  },
  dragDropText: {
    en: 'Drag and drop your audio file here',
    pt: 'Arraste e solte seu arquivo de áudio aqui',
  },
  browseFiles: { en: 'Browse Files', pt: 'Procurar Arquivos' },
  transcribe: { en: 'Transcribe', pt: 'Transcrever' },
  transcribing: { en: 'Transcribing...', pt: 'Transcrevendo...' },
  summarizing: { en: 'Summarizing...', pt: 'Resumindo...' },
  title: { en: 'Title', pt: 'Título' },
  optional: { en: 'Optional', pt: 'Opcional' },
  selectLanguage: { en: 'Audio Language', pt: 'Idioma do Áudio' },
  portuguese: { en: 'Portuguese', pt: 'Português' },
  english: { en: 'English', pt: 'Inglês' },

  // Transcript / Summary
  transcription: { en: 'Transcription', pt: 'Transcrição' },
  summary: { en: 'Summary', pt: 'Resumo' },
  generateSummary: { en: 'Generate Summary', pt: 'Gerar Resumo' },
  copy: { en: 'Copy', pt: 'Copiar' },
  copied: { en: 'Copied!', pt: 'Copiado!' },
  download: { en: 'Download', pt: 'Baixar' },
  noTranscript: {
    en: 'No transcription yet',
    pt: 'Nenhuma transcrição ainda',
  },
  noSummary: { en: 'No summary yet', pt: 'Nenhum resumo ainda' },

  // History
  history: { en: 'History', pt: 'Histórico' },
  noHistory: { en: 'No transcriptions yet', pt: 'Nenhuma transcrição ainda' },
  deleteConfirm: {
    en: 'Are you sure you want to delete this?',
    pt: 'Tem certeza que deseja excluir?',
  },
  delete: { en: 'Delete', pt: 'Excluir' },

  // General
  loading: { en: 'Loading...', pt: 'Carregando...' },
  error: { en: 'Error', pt: 'Erro' },
  success: { en: 'Success', pt: 'Sucesso' },
  cancel: { en: 'Cancel', pt: 'Cancelar' },
  close: { en: 'Close', pt: 'Fechar' },
  settings: { en: 'Settings', pt: 'Configurações' },
  theme: { en: 'Theme', pt: 'Tema' },
  language: { en: 'Language', pt: 'Idioma' },
  darkMode: { en: 'Dark Mode', pt: 'Modo Escuro' },
  lightMode: { en: 'Light Mode', pt: 'Modo Claro' },

  // Errors
  errorInvalidFileType: {
    en: 'Invalid file type. Please upload an audio file (.mp3, .wav, .m4a, .ogg, .webm, .flac)',
    pt: 'Tipo de arquivo inválido. Envie um arquivo de áudio (.mp3, .wav, .m4a, .ogg, .webm, .flac)',
  },
  errorNoFile: { en: 'No file selected', pt: 'Nenhum arquivo selecionado' },
  errorUploadFailed: {
    en: 'Upload failed',
    pt: 'Falha no envio',
  },
  errorTranscribeFailed: {
    en: 'Transcription failed',
    pt: 'Falha na transcrição',
  },
  errorSummarizeFailed: {
    en: 'Summary generation failed',
    pt: 'Falha ao gerar resumo',
  },
  errorAuthRequired: {
    en: 'Authentication required',
    pt: 'Autenticação necessária',
  },
} as const;

export type TranslationKey = keyof typeof translations;
