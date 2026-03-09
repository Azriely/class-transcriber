import { useCallback, useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';
import { useI18n } from '../hooks/useI18n';

interface TranscriptionListItem {
  id: number;
  title: string;
  audio_language: string;
  file_size: number;
  has_summary: boolean;
  created_at: string;
}

interface FullTranscription {
  id: number;
  title: string;
  transcript: string;
  summary: string | null;
}

interface HistorySidebarProps {
  onSelect: (transcription: FullTranscription) => void;
  activeId?: number;
  refreshTrigger?: number;
}

export default function HistorySidebar({
  onSelect,
  activeId,
  refreshTrigger,
}: HistorySidebarProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<TranscriptionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data =
        await api.get<TranscriptionListItem[]>('/transcriptions');
      setItems(data);
    } catch {
      // API layer handles 401 redirect
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshTrigger]);

  const handleSelect = useCallback(
    async (id: number) => {
      try {
        const full = await api.get<FullTranscription>(
          `/transcriptions/${id}`,
        );
        onSelect(full);
      } catch {
        // API layer handles errors
      }
    },
    [onSelect],
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: number) => {
      e.stopPropagation();

      if (!window.confirm(t('deleteConfirm'))) return;

      setDeletingId(id);
      try {
        await api.del(`/transcriptions/${id}`);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch {
        // API layer handles errors
      } finally {
        setDeletingId(null);
      }
    },
    [t],
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const sidebarContent = (
    <>
      <h2 className="text-lg font-semibold mb-4">{t('history')}</h2>

      {isLoading ? (
        <p className="text-sm opacity-50">{t('loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-sm opacity-50">{t('noHistory')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`w-full text-left transition-colors duration-200 ${
                item.id === activeId
                  ? 'ring-2 ring-purple-500/50'
                  : ''
              }`}
            >
              <GlassCard
                variant="subtle"
                className="p-3 hover:bg-white/10 transition-colors duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.title}
                    </p>
                    <p className="text-xs opacity-50 mt-1">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, item.id)}
                    disabled={deletingId === item.id}
                    className="shrink-0 px-2 py-1 rounded-lg text-xs font-medium
                               text-red-400 hover:bg-red-500/20
                               transition-colors duration-200
                               disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={t('delete')}
                  >
                    {deletingId === item.id ? '...' : t('delete')}
                  </button>
                </div>
              </GlassCard>
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-40
                   w-12 h-12 rounded-full glass-strong
                   flex items-center justify-center
                   shadow-lg hover:bg-white/10
                   transition-colors duration-200"
        aria-label={t('history')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile slide-in panel */}
      <div
        className={`lg:hidden fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw]
                     glass-strong p-6 overflow-y-auto custom-scrollbar
                     transform transition-transform duration-300 ease-in-out
                     ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('history')}</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-2 py-1 rounded-lg text-xs font-medium
                       glass-subtle hover:bg-white/10 transition-colors duration-200"
          >
            {t('close')}
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm opacity-50">{t('loading')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm opacity-50">{t('noHistory')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  handleSelect(item.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left transition-colors duration-200 ${
                  item.id === activeId
                    ? 'ring-2 ring-purple-500/50'
                    : ''
                }`}
              >
                <GlassCard
                  variant="subtle"
                  className="p-3 hover:bg-white/10 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {item.title}
                      </p>
                      <p className="text-xs opacity-50 mt-1">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item.id)}
                      disabled={deletingId === item.id}
                      className="shrink-0 px-2 py-1 rounded-lg text-xs font-medium
                                 text-red-400 hover:bg-red-500/20
                                 transition-colors duration-200
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={t('delete')}
                    >
                      {deletingId === item.id ? '...' : t('delete')}
                    </button>
                  </div>
                </GlassCard>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-80 shrink-0">
        <GlassCard className="p-5 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto custom-scrollbar">
          {sidebarContent}
        </GlassCard>
      </aside>
    </>
  );
}
