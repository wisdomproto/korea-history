import axios from 'axios';
import type { GeneratedQuestion } from '@/lib/types';

export const pdfImportApi = {
  parse: async (file: File, examNumber?: number, model?: string): Promise<GeneratedQuestion[]> => {
    const form = new FormData();
    form.append('pdf', file);
    if (examNumber) form.append('examNumber', String(examNumber));
    if (model) form.append('model', model);
    const res = await axios.post('/api/pdf/parse', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000, // 10 min — includes image extraction
    });
    return res.data.data;
  },
};
