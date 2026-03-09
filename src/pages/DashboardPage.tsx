import { useCallback, useEffect, useRef, useState } from 'react';
import UploadZone from '../components/UploadZone';
import TranscriptPanel from '../components/TranscriptPanel';
import SummaryPanel from '../components/SummaryPanel';
import HistorySidebar from '../components/HistorySidebar';
import OrbScene from '../components/OrbScene';
import { api } from '../lib/api';
import type { OrbState } from '../components/ThreeOrb';

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
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const orbResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive orb state from transcription status changes
  const handleStatusChange = useCallback((status: string) => {
    // Clear any pending reset timer
    if (orbResetTimer.current) {
      clearTimeout(orbResetTimer.current);
      orbResetTimer.current = null;
    }

    switch (status) {
      case 'uploading':
      case 'transcribing':
        setOrbState('transcribing');
        break;
      case 'summarizing':
        setOrbState('summarizing');
        break;
      case 'complete':
        setOrbState('complete');
        // Return to idle after a moment
        orbResetTimer.current = setTimeout(() => setOrbState('idle'), 2000);
        break;
      case 'error':
        setOrbState('error');
        // Return to idle after a moment
        orbResetTimer.current = setTimeout(() => setOrbState('idle'), 1500);
        break;
      default:
        setOrbState('idle');
    }
  }, []);

  // Also set orb to summarizing when dashboard triggers its own summarize
  useEffect(() => {
    if (isSummarizing) {
      setOrbState('summarizing');
    }
  }, [isSummarizing]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (orbResetTimer.current) {
        clearTimeout(orbResetTimer.current);
      }
    };
  }, []);

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
        {/* Orb container — positioned behind the upload zone */}
        <div className="relative">
          <div className="h-64 sm:h-72">
            <OrbScene state={orbState} />
          </div>
        </div>

        <UploadZone
          onTranscriptionComplete={handleTranscriptionComplete}
          onStatusChange={handleStatusChange}
        />

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
