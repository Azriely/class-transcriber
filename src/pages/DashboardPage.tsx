import { useCallback, useState } from 'react';
import UploadZone from '../components/UploadZone';
import TranscriptPanel from '../components/TranscriptPanel';
import SummaryPanel from '../components/SummaryPanel';
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

  const handleTranscriptionComplete = useCallback(
    (data: { id: number; transcript: string; title: string }) => {
      setCurrentTranscription(data);
      setSummary(null);
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
    <div className="flex flex-col gap-6">
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
  );
}
