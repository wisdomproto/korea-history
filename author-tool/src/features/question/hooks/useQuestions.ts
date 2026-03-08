import { useMutation, useQueryClient } from '@tanstack/react-query';
import { questionApi } from '../api/question.api';
import type { Question } from '@/lib/types';

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, question }: { examId: number; question: Partial<Question> }) =>
      questionApi.create(examId, question),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['exam', vars.examId] });
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates, examId }: { id: number; updates: Partial<Question>; examId: number }) =>
      questionApi.update(id, updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['exam', vars.examId] });
    },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, examId }: { id: number; examId: number }) => questionApi.delete(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['exam', vars.examId] });
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

export function useAddBatchQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, questions }: { examId: number; questions: Partial<Question>[] }) =>
      questionApi.addBatch(examId, questions),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['exam', vars.examId] });
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}
