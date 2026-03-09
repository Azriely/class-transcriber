import { useCallback, useRef, useState } from 'react';
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

interface SummarizeResult {
  id: number;
  summary: string;
}

interface JobResponse {
  status: 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  result: TranscribeResult | null;
  error: string | null;
}

interface TranscriptionState {
  status: TranscriptionStatus;
  transcript: string | null;
  summary: string | null;
  progress: number;
  message: string | null;
  error: string | null;
  transcriptionId: number | null;
}

const initialState: TranscriptionState = {
  status: 'idle',
  transcript: null,
  summary: null,
  progress: 0,
  message: null,
  error: null,
  transcriptionId: null,
};

const POLL_INTERVAL = 2000; // 2 seconds

export function useTranscription() {
  const [state, setState] = useState<TranscriptionState>(initialState);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const uploadAndTranscribe = useCallback(
    async (file: File, language: string, title?: string, subject?: string): Promise<TranscribeResult> => {
      setState((prev) => ({
        ...prev,
        status: 'uploading',
        error: null,
        message: 'Uploading...',
        progress: 5,
      }));

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('language', language);
      if (title) {
        formData.append('title', title);
      }
      if (subject) {
        formData.append('subject', subject);
      }

      try {
        // Upload file and get job ID (fast response)
        const { jobId } = await api.postMultipart<{ jobId: string }>(
          '/transcriptions/transcribe',
          formData,
        );

        setState((prev) => ({
          ...prev,
          status: 'transcribing',
          message: 'Processing...',
          progress: 10,
        }));

        // Poll for job completion
        return await new Promise<TranscribeResult>((resolve, reject) => {
          pollRef.current = setInterval(async () => {
            try {
              const job = await api.get<JobResponse>(
                `/transcriptions/jobs/${jobId}`,
              );

              setState((prev) => ({
                ...prev,
                progress: job.progress,
                message: job.message,
              }));

              if (job.status === 'complete' && job.result) {
                stopPolling();
                setState((prev) => ({
                  ...prev,
                  status: 'complete',
                  transcript: job.result!.transcript,
                  transcriptionId: job.result!.id,
                  progress: 100,
                  message: 'Done',
                }));
                resolve(job.result);
              } else if (job.status === 'error') {
                stopPolling();
                const errorMsg = job.error || 'Transcription failed';
                setState((prev) => ({
                  ...prev,
                  status: 'error',
                  error: errorMsg,
                  message: errorMsg,
                  progress: 0,
                }));
                reject(new Error(errorMsg));
              }
            } catch (pollErr) {
              // Don't stop polling on transient network errors
              console.warn('Poll error (will retry):', pollErr);
            }
          }, POLL_INTERVAL);
        });
      } catch (err) {
        stopPolling();
        const message =
          err instanceof Error ? err.message : 'Transcription failed';
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: message,
          message,
          progress: 0,
        }));
        throw err;
      }
    },
    [stopPolling],
  );

  const summarize = useCallback(async (transcriptionId: number) => {
    setState((prev) => ({
      ...prev,
      status: 'summarizing',
      error: null,
      message: 'Generating summary...',
      progress: 10,
    }));

    try {
      const { jobId } = await api.post<{ jobId: string }>(
        `/transcriptions/${transcriptionId}/summarize`,
      );

      return await new Promise<SummarizeResult>((resolve, reject) => {
        pollRef.current = setInterval(async () => {
          try {
            const job = await api.get<JobResponse>(
              `/transcriptions/jobs/${jobId}`,
            );

            setState((prev) => ({
              ...prev,
              progress: job.progress,
              message: job.message,
            }));

            if (job.status === 'complete' && job.result) {
              stopPolling();
              const result = job.result as unknown as SummarizeResult;
              setState((prev) => ({
                ...prev,
                status: 'complete',
                summary: result.summary,
                progress: 100,
                message: 'Done',
              }));
              resolve(result);
            } else if (job.status === 'error') {
              stopPolling();
              const errorMsg = job.error || 'Summarization failed';
              setState((prev) => ({
                ...prev,
                status: 'error',
                error: errorMsg,
                message: errorMsg,
                progress: 0,
              }));
              reject(new Error(errorMsg));
            }
          } catch (pollErr) {
            console.warn('Poll error (will retry):', pollErr);
          }
        }, POLL_INTERVAL);
      });
    } catch (err) {
      stopPolling();
      const message =
        err instanceof Error ? err.message : 'Summary generation failed';
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
        message,
        progress: 0,
      }));
      throw err;
    }
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState(initialState);
  }, [stopPolling]);

  return {
    ...state,
    uploadAndTranscribe,
    summarize,
    reset,
  };
}
