import { useQuery } from '@tanstack/react-query';
import { summaryNoteApi } from '../api/summary-note.api';

export function useSummaryNote(categoryCode: string | undefined, noteId: string | undefined) {
  return useQuery({
    queryKey: ['summary-note', categoryCode, noteId],
    queryFn: () => summaryNoteApi.get(categoryCode!, noteId!),
    enabled: !!categoryCode && !!noteId,
  });
}
