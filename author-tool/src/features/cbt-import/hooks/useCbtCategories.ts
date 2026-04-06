import { useQuery } from '@tanstack/react-query';
import { cbtApi } from '../api/cbt.api';

export function useCbtCategories(enabled = false) {
  return useQuery({
    queryKey: ['cbt-categories'],
    queryFn: cbtApi.getCategories,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
