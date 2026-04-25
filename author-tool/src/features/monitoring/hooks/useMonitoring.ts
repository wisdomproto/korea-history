import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listComments,
  fetchSummary,
  syncComments,
  analyzeComment,
  analyzeBatch,
  replyComment,
  ignoreComment,
  updateDraft,
} from '../api/monitoring.api';
import type { CommentChannel, CommentSentiment, ReplyStatus } from '../types';

export function useComments(filter: {
  projectId?: string;
  channel?: CommentChannel;
  sentiment?: CommentSentiment;
  replyStatus?: ReplyStatus;
}) {
  return useQuery({
    queryKey: ['comments', filter.projectId, filter.channel, filter.sentiment, filter.replyStatus],
    queryFn: () => listComments(filter as { projectId: string }),
    enabled: !!filter.projectId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useCommentSummary(projectId?: string) {
  return useQuery({
    queryKey: ['comments', 'summary', projectId],
    queryFn: () => fetchSummary(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useSyncComments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, channel }: { projectId: string; channel?: CommentChannel }) =>
      syncComments(projectId, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  });
}

export function useAnalyzeComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => analyzeComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  });
}

export function useAnalyzeBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, limit }: { projectId: string; limit?: number }) =>
      analyzeBatch(projectId, limit),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  });
}

export function useReplyComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => replyComment(id, message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  });
}

export function useIgnoreComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ignoreComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  });
}

export function useUpdateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: string }) => updateDraft(id, draft),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  });
}
