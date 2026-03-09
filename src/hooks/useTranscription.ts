import { useCallback, useState } from 'react';
import { api } from '../lib/api';

export type TranscriptionStatus =
  | 'idle'
  | 'uploading'
  | 'transcribing'
  | 'summarizing'
  | 'complete'
  | 'error';

interface TranscribeResponse {
  id: number;
  title: string;
  transcript: string;
  createdAt: string;
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
    async (file: File, language: string, title?: string) => {
      setState((prev) => ({
        ...prev,
        status: 'uploading',
        error: null,
        progress: 10,
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
          progress: 40,
        }));

        const data = await api.postMultipart<TranscribeResponse>(
          '/transcriptions/transcribe',
          formData,
        );

        setState((prev) => ({
          ...prev,
          status: 'complete',
          transcript: data.transcript,
          transcriptionId: data.id,
          progress: 100,
        }));

        return data;
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
