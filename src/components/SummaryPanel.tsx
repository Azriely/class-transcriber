import { useCallback, useState, type ReactNode } from 'react';
import GlassCard from '../components/GlassCard';
import { useI18n } from '../hooks/useI18n';

interface SummaryPanelProps {
  summary: string;
}

/**
 * Renders markdown-like text into React elements.
 * Supports: ## headers, **bold** paragraphs, - bullet lists, plain paragraphs.
 */
function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 mb-3">
          {listItems}
        </ul>,
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // ## Header
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-base font-semibold mt-4 mb-2 first:mt-0">
          {trimmed.slice(3)}
        </h3>,
      );
      continue;
    }

    // **bold** paragraph (entire line is bold)
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
      flushList();
      elements.push(
        <p key={key++} className="font-bold text-sm mb-2">
          {trimmed.slice(2, -2)}
        </p>,
      );
      continue;
    }

    // - bullet item
    if (trimmed.startsWith('- ')) {
      const content = trimmed.slice(2);
      // Render inline bold within list items
      listItems.push(
        <li key={key++} className="text-sm opacity-85">
          {renderInlineBold(content)}
        </li>,
      );
      continue;
    }

    // Plain paragraph
    flushList();
    elements.push(
      <p key={key++} className="text-sm leading-relaxed mb-2 opacity-85">
        {renderInlineBold(trimmed)}
      </p>,
    );
  }

  flushList();
  return elements;
}

/**
 * Handles inline **bold** within a line of text.
 */
function renderInlineBold(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function SummaryPanel({ summary }: SummaryPanelProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [summary]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [summary]);

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <GlassCard className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('summary')}</h2>
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
          {summary ? renderMarkdown(summary) : (
            <p className="text-sm opacity-50">{t('noSummary')}</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
