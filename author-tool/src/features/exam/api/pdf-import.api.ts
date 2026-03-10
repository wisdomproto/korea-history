import type { GeneratedQuestion } from '@/lib/types';

export const pdfImportApi = {
  parse: async (
    file: File,
    examNumber?: number,
    model?: string,
    onProgress?: (message: string) => void,
  ): Promise<GeneratedQuestion[]> => {
    const form = new FormData();
    form.append('pdf', file);
    if (examNumber) form.append('examNumber', String(examNumber));
    if (model) form.append('model', model);

    const response = await fetch('/api/pdf/parse', {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('스트리밍 응답을 받을 수 없습니다.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: GeneratedQuestion[] | null = null;
    let error: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'progress' && data.message) {
            onProgress?.(data.message);
          } else if (data.type === 'done' && data.data) {
            result = data.data;
          } else if (data.type === 'error') {
            error = data.error || '알 수 없는 오류';
          }
        } catch { /* ignore malformed JSON */ }
      }
    }

    if (error) throw new Error(error);
    if (!result) throw new Error('서버에서 결과를 받지 못했습니다.');
    return result;
  },
};
