import { useQuery } from '@tanstack/react-query';
import { cbtApi } from '../api/cbt.api';

export function useCbtExam(categoryCode: string | undefined, examId: string | undefined) {
  return useQuery({
    queryKey: ['cbt-exam', categoryCode, examId],
    queryFn: () => cbtApi.getExam(categoryCode!, examId!),
    enabled: !!categoryCode && !!examId,
    staleTime: 5 * 60 * 1000,
  });
}
