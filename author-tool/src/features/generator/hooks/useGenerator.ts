import { useMutation } from '@tanstack/react-query';
import { generatorApi } from '../api/generator.api';
import type { GenerateRequest } from '@/lib/types';

export function useGenerateQuestions() {
  return useMutation({
    mutationFn: (req: GenerateRequest) => generatorApi.generate(req),
  });
}
