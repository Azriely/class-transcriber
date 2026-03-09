import { useCallback, useState } from 'react';
import { api } from '../lib/api';

export type TranscriptionStatus =
  | 'idle'
  | 'uploading'
  | 'transcribing'
  | 'summarizing'
  | 'complete'
  | 'error';

interface TranscribeResult {
  id: number;
  title: string;
  transcript: string;
}

interface SummarizeResponse {
  summary: string;
}

interface TranscriptionState {
  status: TranscriptionStatus;
  transcript: string | null;
  summary: string | null;
  progress: number;
  error: string | null;
  transcriptionId: number | null;
}

const initialState: TranscriptionState = {
  status: 'idle',
  transcript: null,
  summary: null,
  progress: 0,
  error: null,
  transcriptionId: null,
};

export function useTranscription() {
  const [state, setState] = useState<TranscriptionState>(initialState);

  const uploadAndTranscribe = useCallback(
    async (file: File, language: string, title?: string): Promise<TranscribeResult> => {
      setState((prev) => ({
        ...prev,
        status: 'uploading',
        error: null,
        progress: 5,
      }));

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('language', language);
      if (title) {
        formData.append('title', title);
      }

      try {
        setState((prev) => ({
          ...prev,
          status: 'transcribing',
          progress: 10,
        }));

        // Stream the response (SSE) to get progress updates
        const response = await fetch('/api/transcriptions/transcribe', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.text();
          throw new Error(err || 'Transcription failed');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let result: TranscribeResult | null = null;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'progress') {
                setState((prev) => ({
                  ...prev,
                  progress: event.progress ?? prev.progress,
                }));
              } else if (event.type === 'complete') {
                result = {
                  id: event.id,
                  title: event.title,
                  transcript: event.transcript,
                };
                setState((prev) => ({
                  ...prev,
                  status: 'complete',
                  transcript: event.transcript,
                  transcriptionId: event.id,
                  progress: 100,
                }));
              } else if (event.type === 'error') {
                throw new Error(event.error);
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue; // skip malformed lines
              throw parseErr;
            }
          }
        }

        if (!result) throw new Error('No result received');
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Transcription failed';
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: message,
          progress: 0,
        }));
        throw err;
      }
    },
    [],
  );

  const summarize = useCallback(async (transcriptionId: number) => {
    setState((prev) => ({
      ...prev,
      status: 'summarizing',
      error: null,
      progress: 60,
    }));

    try {
      const data = await api.post<SummarizeResponse>(
        `/transcriptions/${transcriptionId}/summarize`,
      );

      setState((prev) => ({
        ...prev,
        status: 'complete',
        summary: data.summary,
        progress: 100,
      }));

      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Summary generation failed';
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
        progress: 0,
      }));
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    uploadAndTranscribe,
    summarize,
    reset,
  };
}
