import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDashboard, fetchDailyTrend, fetchPresets, refreshCache } from '../api/analytics.api';

export function useDashboard(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', startDate, endDate],
    queryFn: () => fetchDashboard(startDate, endDate),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!(startDate && endDate),
  });
}

export function useDailyTrend(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['analytics', 'daily', startDate, endDate],
    queryFn: () => fetchDailyTrend(startDate, endDate),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!(startDate && endDate),
  });
}

export function usePresets() {
  return useQuery({
    queryKey: ['analytics', 'presets'],
    queryFn: fetchPresets,
    staleTime: 60 * 60 * 1000,
  });
}

export function useRefreshDashboard() {
  const queryClient = useQueryClient();
  return async () => {
    await refreshCache();
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
}
