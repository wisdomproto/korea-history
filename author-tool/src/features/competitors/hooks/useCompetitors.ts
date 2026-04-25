import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listCompetitors, getCompetitor, createCompetitor, updateCompetitor, deleteCompetitor,
  addChannel, removeChannel, syncCompetitor, extractTopics, gapAnalysis,
} from '../api/competitors.api';
import type { Competitor, CompetitorChannelType } from '../types';

export function useCompetitors(projectId?: string) {
  return useQuery({
    queryKey: ['competitors', projectId],
    queryFn: () => listCompetitors(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useCompetitor(id?: string) {
  return useQuery({
    queryKey: ['competitor', id],
    queryFn: () => getCompetitor(id!),
    enabled: !!id,
  });
}

export function useCreateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCompetitor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competitors'] }),
  });
}

export function useUpdateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Competitor> }) => updateCompetitor(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitors'] });
      qc.invalidateQueries({ queryKey: ['competitor'] });
    },
  });
}

export function useDeleteCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCompetitor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competitors'] }),
  });
}

export function useAddChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type, url, identifier }: { id: string; type: CompetitorChannelType; url: string; identifier?: string }) =>
      addChannel(id, { type, url, identifier }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitor'] });
      qc.invalidateQueries({ queryKey: ['competitors'] });
    },
  });
}

export function useRemoveChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, channelId }: { id: string; channelId: string }) => removeChannel(id, channelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitor'] });
      qc.invalidateQueries({ queryKey: ['competitors'] });
    },
  });
}

export function useSyncCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncCompetitor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitor'] });
      qc.invalidateQueries({ queryKey: ['competitors'] });
    },
  });
}

export function useExtractTopics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: extractTopics,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitor'] });
      qc.invalidateQueries({ queryKey: ['competitors'] });
    },
  });
}

export function useGapAnalysis() {
  return useMutation({
    mutationFn: gapAnalysis,
  });
}
