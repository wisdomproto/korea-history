import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface GenerateOptions {
  categoryCode: string;
  examIds: string[];
  mode: 'quick' | 'polish';
  model?: string;
}

interface ProgressState {
  generating: boolean;
  step: string;
  current: number;
  total: number;
  topicCount: number;
  error: string | null;
  noteId: string | null;
}

export function useGenerateSummaryNote() {
  const [state, setState] = useState<ProgressState>({
    generating: false, step: '', current: 0, total: 0,
    topicCount: 0, error: null, noteId: null,
  });
  const qc = useQueryClient();

  const generate = useCallback(async (opts: GenerateOptions) => {
    setState({ generating: true, step: 'loading', current: 0, total: 0, topicCount: 0, error: null, noteId: null });

    try {
      const res = await fetch('/api/summary-notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'progress') {
              setState((s) => ({
                ...s,
                step: event.step || s.step,
                current: event.current ?? s.current,
                total: event.total ?? s.total,
                topicCount: event.topicCount ?? s.topicCount,
              }));
            } else if (event.type === 'complete') {
              setState((s) => ({ ...s, generating: false, noteId: event.noteId }));
              qc.invalidateQueries({ queryKey: ['summary-notes', opts.categoryCode] });
            } else if (event.type === 'error') {
              setState((s) => ({ ...s, generating: false, error: event.message }));
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: any) {
      setState((s) => ({ ...s, generating: false, error: err.message }));
    }
  }, [qc]);

  return { ...state, generate };
}
