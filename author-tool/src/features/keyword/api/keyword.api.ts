import { apiGet } from '@/lib/axios';

export interface KeywordsData {
  keywords: Record<string, number[]>;
  generatedAt?: string;
}

export interface KeywordStats {
  totalKeywords: number;
  totalMappings: number;
  byEra: Record<string, { keywords: string[]; count: number }>;
  byCategory: Record<string, { keywords: string[]; count: number }>;
  topKeywords: { keyword: string; count: number; era: string; category: string }[];
}

export const keywordApi = {
  get: () => apiGet<KeywordsData | null>('/keywords'),
  getStats: () => apiGet<KeywordStats | null>('/keywords/stats'),

  /** SSE-based extraction — returns EventSource */
  extract(onProgress: (msg: string) => void, onDone: () => void, onError: (err: string) => void) {
    const es = new EventSource('/api/keywords/extract', );
    // POST via fetch + SSE reading
    const ctrl = new AbortController();

    fetch('/api/keywords/extract', {
      method: 'POST',
      signal: ctrl.signal,
    }).then(async (res) => {
      const reader = res.body?.getReader();
      if (!reader) { onError('스트림 없음'); return; }
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === 'progress') {
              onProgress(payload.message);
            } else if (payload.type === 'done') {
              onDone();
            } else if (payload.type === 'error') {
              onError(payload.error);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message);
      }
    });

    return { abort: () => ctrl.abort() };
  },
};
