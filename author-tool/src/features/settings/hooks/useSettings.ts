import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEnvStatus, fetchProjectSettings, patchProjectSettings } from '../api/settings.api';
import type { ProjectSettings } from '../types';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useProjectSettings(projectId: string) {
  return useQuery({
    queryKey: ['project-settings', projectId],
    queryFn: () => fetchProjectSettings(projectId),
    enabled: !!projectId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateProjectSettings(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ProjectSettings>) => patchProjectSettings(projectId, patch),
    onSuccess: (data) => {
      qc.setQueryData(['project-settings', projectId], data);
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useEnvStatus() {
  return useQuery({
    queryKey: ['env-status'],
    queryFn: fetchEnvStatus,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

interface UseDebouncedPatchArgs {
  projectId: string;
  delay?: number;
}

export function useDebouncedPatch({ projectId, delay = 600 }: UseDebouncedPatchArgs) {
  const mutation = useUpdateProjectSettings(projectId);
  const timer = useRef<number | null>(null);
  const pending = useRef<Partial<ProjectSettings> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const flush = useCallback(async () => {
    if (!pending.current) return;
    const payload = pending.current;
    pending.current = null;
    setIsSaving(true);
    try {
      await mutation.mutateAsync(payload);
      setLastSavedAt(Date.now());
    } finally {
      setIsSaving(false);
    }
  }, [mutation]);

  const schedule = useCallback(
    (patch: Partial<ProjectSettings>) => {
      pending.current = { ...(pending.current ?? {}), ...patch };
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        flush();
      }, delay);
    },
    [flush, delay]
  );

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
    if (pending.current) flush();
  }, [flush]);

  return { schedule, flush, isSaving, lastSavedAt };
}
