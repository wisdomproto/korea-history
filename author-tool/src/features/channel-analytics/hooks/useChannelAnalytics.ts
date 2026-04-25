import { useQuery } from '@tanstack/react-query';
import { fetchInstagramSnapshot, fetchYoutubeSnapshot } from '../api/channel-analytics.api';

export function useInstagramSnapshot() {
  return useQuery({
    queryKey: ['channel-analytics', 'instagram'],
    queryFn: fetchInstagramSnapshot,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useYoutubeSnapshot(projectId?: string) {
  return useQuery({
    queryKey: ['channel-analytics', 'youtube', projectId],
    queryFn: () => fetchYoutubeSnapshot(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
