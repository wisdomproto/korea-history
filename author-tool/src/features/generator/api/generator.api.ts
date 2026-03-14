import { apiPost } from '@/lib/axios';
import type { GenerateRequest, GeneratedQuestion } from '@/lib/types';

interface ExplanationRequest {
  content: string;
  choices: [string, string, string, string, string];
  correctAnswer: number;
  era: string;
  category: string;
}

export const generatorApi = {
  generate: (req: GenerateRequest) => apiPost<GeneratedQuestion[]>('/generate/questions', req),
  generateExplanation: (req: ExplanationRequest) => apiPost<string>('/generate/explanation', req),
};
