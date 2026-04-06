// author-tool/src/features/content/hooks/useContent.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/content.api';
import type { ContentFile, ChannelType } from '../../../lib/content-types';

const KEYS = {
  list: ['contents'] as const,
  detail: (id: string) => ['contents', id] as const,
};

export function useContents() {
  return useQuery({
    queryKey: KEYS.list,
    queryFn: api.fetchContents,
  });
}

export function useContent(id: string | null) {
  return useQuery({
    queryKey: KEYS.detail(id!),
    queryFn: () => api.fetchContent(id!),
    enabled: !!id,
  });
}

export function useCreateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { title: string; sourceType: 'exam' | 'note' | 'free'; sourceId?: string }) =>
      api.createContent(vars.title, vars.sourceType, vars.sourceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

export function useUpdateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; updates: Partial<{ title: string; status: string }> }) =>
      api.updateContent(vars.id, vars.updates),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.list });
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) });
    },
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteContent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

export function useSaveBaseArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; html: string; keywords: string[]; summary: string }) =>
      api.saveBaseArticle(vars.id, { html: vars.html, keywords: vars.keywords, summary: vars.summary }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) });
    },
  });
}

export function useSaveChannelContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; channel: ChannelType; channelContentId: string; data: any }) =>
      api.saveChannelContent(vars.id, vars.channel, vars.channelContentId, vars.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) });
    },
  });
}

export function useDeleteChannelContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; channel: ChannelType; channelContentId: string }) =>
      api.deleteChannelContent(vars.id, vars.channel, vars.channelContentId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) });
    },
  });
}

export function useGenerateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      contentId: string;
      channel: ChannelType;
      targetId: string;
      imagePrompt: string;
      modelId?: string;
      aspectRatio?: string;
    }) => api.generateImage(vars.contentId, vars.channel, vars.targetId, vars.imagePrompt, vars.modelId, vars.aspectRatio),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.contentId) });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || '이미지 생성 실패';
      alert(`이미지 생성 오류: ${msg}`);
    },
  });
}

// Refetch helper for after SSE generation completes
export function useRefreshContent() {
  const qc = useQueryClient();
  return (contentId: string) => {
    qc.invalidateQueries({ queryKey: KEYS.list });
    qc.invalidateQueries({ queryKey: KEYS.detail(contentId) });
  };
}
