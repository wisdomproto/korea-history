import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listCampaigns, fetchSummary, createCampaign, updateCampaign, deleteCampaign } from '../api/ads.api';
import type { AdCampaign, AdPlatform, AdStatus, CreateCampaignInput } from '../types';

export function useCampaigns(filter: { projectId?: string; platform?: AdPlatform; status?: AdStatus }) {
  return useQuery({
    queryKey: ['ad-campaigns', filter.projectId, filter.platform, filter.status],
    queryFn: () => listCampaigns(filter as { projectId: string }),
    enabled: !!filter.projectId,
    staleTime: 15 * 1000,
  });
}

export function useAdSummary(projectId?: string) {
  return useQuery({
    queryKey: ['ad-campaigns', 'summary', projectId],
    queryFn: () => fetchSummary(projectId!),
    enabled: !!projectId,
    staleTime: 15 * 1000,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampaignInput) => createCampaign(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-campaigns'] }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AdCampaign> }) => updateCampaign(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-campaigns'] }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-campaigns'] }),
  });
}
