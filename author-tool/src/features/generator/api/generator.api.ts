import { apiPost } from '@/lib/axios';
import type { GenerateRequest, GeneratedQuestion } from '@/lib/types';

export const generatorApi = {
  generate: (req: GenerateRequest) => apiPost<GeneratedQuestion[]>('/generate/questions', req),
};
