import { apiGet } from '@/lib/axios';

interface ExamInfo {
  examNumber: number;
  questionCount: number;
}

interface QuestionData {
  examNumber: number;
  questionNumber: number;
  content: string;
  choices: string[];
  correctAnswer: number;
  era: string;
  category: string;
  points: number;
  keywords?: string[];
  explanation?: string;
}

interface ModelInfo {
  id: string;
  label: string;
  default?: boolean;
}

export interface CardNewsSlideResult {
  examNumber: number;
  questionNumber: number;
  slides: string[]; // base64 PNGs
}

export const cardNewsApi = {
  getExams: () => apiGet<ExamInfo[]>('/card-news/exams'),
  getQuestions: (examNumber: number) => apiGet<QuestionData[]>(`/card-news/questions/${examNumber}`),
  getModels: () => apiGet<ModelInfo[]>('/card-news/models'),

  /** SSE-based generation with progress */
  generate: (
    body: {
      questions: QuestionData[];
      ctaText?: string;
      ctaUrl?: string;
      useAiExplanation?: boolean;
      model?: string;
    },
    onProgress: (msg: string) => void,
    onComplete: (results: CardNewsSlideResult[]) => void,
    onError: (msg: string) => void,
  ) => {
    const controller = new AbortController();

    fetch('/api/card-news/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        try { onError(JSON.parse(text).error || `HTTP ${res.status}`); } catch { onError(`HTTP ${res.status}: ${text.slice(0, 200)}`); }
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) { onError('스트림을 읽을 수 없습니다.'); return; }
      const decoder = new TextDecoder();
      let buffer = '';
      let gotComplete = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') onProgress(data.message);
            else if (data.type === 'complete') { onComplete(data.results); gotComplete = true; }
            else if (data.type === 'error') onError(data.message);
          } catch (e) {
            console.error('SSE parse error:', e, 'line:', line.slice(0, 100));
          }
        }
      }

      if (!gotComplete) {
        // Process remaining buffer
        if (buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.type === 'complete') { onComplete(data.results); gotComplete = true; }
            else if (data.type === 'error') onError(data.message);
          } catch {}
        }
        if (!gotComplete) onError('생성이 완료되지 않았습니다. 서버 로그를 확인해주세요.');
      }
    }).catch((err) => {
      if (err.name !== 'AbortError') onError(err.message || '네트워크 오류');
    });

    return controller;
  },

  /** Direct download as ZIP */
  downloadZip: async (body: any) => {
    const res = await fetch('/api/card-news/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'card-news.zip';
    a.click();
    URL.revokeObjectURL(url);
  },
};

export type { QuestionData, ExamInfo, ModelInfo };
