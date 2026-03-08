import axios from 'axios';
import type { GeneratedQuestion } from '@/lib/types';

export const pdfImportApi = {
  parse: async (file: File, model?: string): Promise<GeneratedQuestion[]> => {
    const form = new FormData();
    form.append('pdf', file);
    if (model) form.append('model', model);
    const res = await axios.post('/api/pdf/parse', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 min — vision PDF analysis can be slow
    });
    return res.data.data;
  },
};
