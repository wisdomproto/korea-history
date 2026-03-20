import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi, type Note } from '../api/notes.api';

export function useNotes() {
  return useQuery({ queryKey: ['notes'], queryFn: notesApi.getAll });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: ['note', id],
    queryFn: () => notesApi.getById(id!),
    enabled: !!id,
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Note> }) => notesApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['note', id] });
    },
  });
}

export function useNotesStats() {
  return useQuery({ queryKey: ['notes-stats'], queryFn: notesApi.getStats });
}
