import axios from 'axios';
import { apiGet, apiPost } from '@/lib/axios';
import type { ModelsResponse } from '@/lib/types';

export const imageApi = {
  upload: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('image', file);
    const res = await axios.post('/api/images/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.url;
  },

  generate: (prompt: string, model?: string) =>
    apiPost<{ url: string }>('/images/generate', { prompt, model }),

  delete: (url: string) => apiPost<void>('/images/delete', { url }),

  getModels: () => apiGet<ModelsResponse>('/images/models'),
};
