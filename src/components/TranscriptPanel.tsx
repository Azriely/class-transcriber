import { useCallback, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { useI18n } from '../hooks/useI18n';

interface TranscriptPanelProps {
  transcript: string;
  onGenerateSummary: () => void;
  isSummarizing?: boolean;
}

export default function TranscriptPanel({
  transcript,
  onGenerateSummary,
  isSummarizing = false,
}: TranscriptPanelProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [transcript]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [transcript]);

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <GlassCard className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('transcription')}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium
                         glass-subtle hover:bg-white/10 transition-colors duration-200"
            >
              {copied ? t('copied') : t('copy')}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg text-xs font-medium
                         glass-subtle hover:bg-white/10 transition-colors duration-200"
            >
              {t('download')}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          <p className="text-sm leading-relaxed whitespace-pre-wrap opacity-85">
            {transcript || t('noTranscript')}
          </p>
        </div>

        {/* Generate Summary button */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onGenerateSummary}
            disabled={isSummarizing || !transcript}
            className="w-full px-5 py-2.5 rounded-xl font-medium text-sm
                       bg-purple-600 hover:bg-purple-500 text-white
                       transition-colors duration-200
                       disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isSummarizing && (
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {isSummarizing ? t('summarizing') : t('generateSummary')}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
