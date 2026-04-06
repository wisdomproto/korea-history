import { useQuery } from '@tanstack/react-query';
import { cbtApi } from '../api/cbt.api';

export function useCbtExams(categoryCode: string | undefined) {
  return useQuery({
    queryKey: ['cbt-exams', categoryCode],
    queryFn: () => cbtApi.getExams(categoryCode!),
    enabled: !!categoryCode,
    staleTime: 5 * 60 * 1000,
  });
}
