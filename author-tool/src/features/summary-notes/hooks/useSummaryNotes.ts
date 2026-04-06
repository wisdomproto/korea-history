import { useQuery } from '@tanstack/react-query';
import { summaryNoteApi } from '../api/summary-note.api';

export function useSummaryNotes(categoryCode: string | undefined) {
  return useQuery({
    queryKey: ['summary-notes', categoryCode],
    queryFn: () => summaryNoteApi.list(categoryCode!),
    enabled: !!categoryCode,
  });
}
