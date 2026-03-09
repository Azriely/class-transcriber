import { useCallback, useState } from 'react';
import UploadZone from '../components/UploadZone';
import TranscriptPanel from '../components/TranscriptPanel';
import SummaryPanel from '../components/SummaryPanel';
import HistorySidebar from '../components/HistorySidebar';
import { api } from '../lib/api';

interface TranscriptionResult {
  id: number;
  transcript: string;
  title: string;
}

interface SummarizeResponse {
  summary: string;
}

export default function DashboardPage() {
  const [currentTranscription, setCurrentTranscription] =
    useState<TranscriptionResult | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTranscriptionComplete = useCallback(
    (data: { id: number; transcript: string; title: string }) => {
      setCurrentTranscription(data);
      setSummary(null);
      setRefreshTrigger((prev) => prev + 1);
    },
    [],
  );

  const handleHistorySelect = useCallback(
    (transcription: {
      id: number;
      title: string;
      transcript: string;
      summary: string | null;
    }) => {
      setCurrentTranscription({
        id: transcription.id,
        transcript: transcription.transcript,
        title: transcription.title,
      });
      setSummary(transcription.summary);
    },
    [],
  );

  const handleGenerateSummary = useCallback(async () => {
    if (!currentTranscription) return;

    setIsSummarizing(true);

    try {
      const data = await api.post<SummarizeResponse>(
        `/transcriptions/${currentTranscription.id}/summarize`,
      );
      setSummary(data.summary);
    } catch {
      // Error is handled by the API layer (e.g. 401 redirect)
    } finally {
      setIsSummarizing(false);
    }
  }, [currentTranscription]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main content */}
      <div className="flex-1 flex flex-col gap-6">
        <UploadZone onTranscriptionComplete={handleTranscriptionComplete} />

        {currentTranscription && (
          <TranscriptPanel
            transcript={currentTranscription.transcript}
            onGenerateSummary={handleGenerateSummary}
            isSummarizing={isSummarizing}
          />
        )}

        {summary && <SummaryPanel summary={summary} />}
      </div>

      {/* Sidebar */}
      <HistorySidebar
        onSelect={handleHistorySelect}
        activeId={currentTranscription?.id}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
