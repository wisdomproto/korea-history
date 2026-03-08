import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examApi } from '../api/exam.api';
import type { Exam } from '@/lib/types';

export function useExams() {
  return useQuery({ queryKey: ['exams'], queryFn: examApi.list });
}

export function useExam(id: number | null) {
  return useQuery({
    queryKey: ['exam', id],
    queryFn: () => examApi.getById(id!),
    enabled: id !== null,
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exam: Omit<Exam, 'id'>) => examApi.create(exam),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Exam> }) => examApi.update(id, updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      qc.invalidateQueries({ queryKey: ['exam', vars.id] });
    },
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => examApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}
