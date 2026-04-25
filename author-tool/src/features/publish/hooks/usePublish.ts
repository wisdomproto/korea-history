import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listJobs,
  createJob,
  cancelJob,
  retryJob,
  publishNow,
  deleteJob,
  testWordPress,
} from '../api/publish.api';
import type { PublishChannel, PublishStatus, CreateJobInput } from '../types';

export function useJobs(filter?: {
  projectId?: string;
  status?: PublishStatus;
  channel?: PublishChannel;
}) {
  return useQuery({
    queryKey: ['publish-jobs', filter?.projectId, filter?.status, filter?.channel],
    queryFn: () => listJobs(filter),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    enabled: !!filter?.projectId,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobInput) => createJob(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publish-jobs'] }),
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publish-jobs'] }),
  });
}

export function useRetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt?: string }) => retryJob(id, scheduledAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publish-jobs'] }),
  });
}

export function usePublishNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishNow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publish-jobs'] }),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publish-jobs'] }),
  });
}

export function useTestWordPress() {
  return useMutation({
    mutationFn: (projectId: string) => testWordPress(projectId),
  });
}
