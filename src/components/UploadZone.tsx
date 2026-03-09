import { useCallback, useEffect, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useTranscription } from '../hooks/useTranscription';
import { useI18n } from '../hooks/useI18n';

const ACCEPTED_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
];

const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac'];

interface UploadZoneProps {
  onTranscriptionComplete?: (data: {
    id: number;
    transcript: string;
    title: string;
  }) => void;
  onStatusChange?: (status: string) => void;
}

function isValidAudioFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  // Also check by extension if MIME type is generic
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadZone({ onTranscriptionComplete, onStatusChange }: UploadZoneProps) {
  const { t } = useI18n();
  const {
    status,
    progress,
    message,
    error,
    uploadAndTranscribe,
    reset,
  } = useTranscription();

  // Notify parent of status changes for orb state tracking
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<string>('pt');
  const [title, setTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy =
    status === 'uploading' ||
    status === 'transcribing' ||
    status === 'summarizing';

  const handleFile = useCallback(
    (incoming: File) => {
      setValidationError(null);
      if (!isValidAudioFile(incoming)) {
        setValidationError(t('errorInvalidFileType'));
        return;
      }
      setFile(incoming);
    },
    [t],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        handleFile(selected);
      }
    },
    [handleFile],
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleTranscribe = useCallback(async () => {
    if (!file) {
      setValidationError(t('errorNoFile'));
      return;
    }

    setValidationError(null);

    try {
      const data = await uploadAndTranscribe(
        file,
        language,
        title || undefined,
      );

      onTranscriptionComplete?.({
        id: data.id,
        transcript: data.transcript,
        title: data.title,
      });
    } catch {
      // Error is already captured in the hook state
    }
  }, [file, language, title, uploadAndTranscribe, onTranscriptionComplete, t]);

  const handleReset = useCallback(() => {
    reset();
    setFile(null);
    setTitle('');
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [reset]);

  const displayError = validationError || error;

  return (
    <div className="glass rounded-2xl p-8 animate-[fadeIn_0.5s_ease-out]">
      <h2 className="text-xl font-semibold mb-2">{t('uploadTitle')}</h2>
      <p className="text-sm opacity-70 mb-6">{t('uploadDescription')}</p>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isBusy ? handleBrowseClick : undefined}
        className={`
          glass-subtle rounded-xl p-10 text-center cursor-pointer
          transition-all duration-200 border-2 border-dashed
          ${dragOver
            ? 'border-purple-400 bg-purple-500/10 scale-[1.02] drag-pulse'
            : 'border-white/10 hover:border-white/20'
          }
          ${isBusy ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac"
          onChange={handleInputChange}
          className="hidden"
          disabled={isBusy}
        />

        {file ? (
          <div className="space-y-1">
            <p className="font-medium truncate max-w-xs mx-auto">
              {file.name}
            </p>
            <p className="text-sm opacity-60">{formatFileSize(file.size)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl opacity-40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="opacity-70">{t('dragDropText')}</p>
            <button
              type="button"
              className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-2"
            >
              {t('browseFiles')}
            </button>
          </div>
        )}
      </div>

      {/* Language selector + title */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 opacity-80">
            {t('selectLanguage')}
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isBusy}
            className="w-full glass-subtle rounded-lg px-3 py-2 text-sm bg-transparent outline-none
                       focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50"
          >
            <option value="pt">{t('portuguese')}</option>
            <option value="en">{t('english')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 opacity-80">
            {t('title')}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isBusy}
            placeholder={t('optional')}
            className="w-full glass-subtle rounded-lg px-3 py-2 text-sm bg-transparent outline-none
                       focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50
                       placeholder:opacity-40"
          />
        </div>
      </div>

      {/* Error message */}
      {displayError && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {displayError}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleTranscribe}
          disabled={isBusy || !file}
          className="btn-glow px-6 py-2.5 rounded-xl font-medium text-sm
                     bg-purple-600 hover:bg-purple-500 text-white
                     transition-colors duration-200
                     disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {status === 'uploading' || status === 'transcribing'
            ? t('transcribing')
            : status === 'summarizing'
              ? t('summarizing')
              : t('transcribe')}
        </button>

        {(file || status === 'complete' || status === 'error') && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isBusy}
            className="px-4 py-2.5 rounded-xl text-sm opacity-60 hover:opacity-100
                       transition-opacity duration-200 disabled:cursor-not-allowed"
          >
            {t('cancel')}
          </button>
        )}
      </div>

      {/* Progress indicator */}
      {isBusy && (
        <div className="mt-4">
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-500 ease-out
                         shadow-[0_0_8px_rgba(168,85,247,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs opacity-50 mt-2">{message || t('loading')}</p>
        </div>
      )}
    </div>
  );
}
