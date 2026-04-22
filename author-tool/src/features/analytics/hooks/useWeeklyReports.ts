import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWeeklyReports,
  fetchWeeklyReport,
  generateWeeklyReport,
  deleteWeeklyReport,
} from '../api/weekly-report.api';

export function useWeeklyReports() {
  return useQuery({
    queryKey: ['weekly-reports', 'list'],
    queryFn: fetchWeeklyReports,
    staleTime: 60 * 1000,
  });
}

export function useWeeklyReport(weekStart: string | null) {
  return useQuery({
    queryKey: ['weekly-reports', 'detail', weekStart],
    queryFn: () => fetchWeeklyReport(weekStart!),
    enabled: !!weekStart,
    staleTime: 60 * 1000,
  });
}

export function useGenerateWeeklyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params?: { weekStart?: string; weekEnd?: string }) =>
      generateWeeklyReport(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-reports'] });
    },
  });
}

export function useDeleteWeeklyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weekStart: string) => deleteWeeklyReport(weekStart),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-reports'] });
    },
  });
}
