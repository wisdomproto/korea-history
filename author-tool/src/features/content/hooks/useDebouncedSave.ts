import { useRef, useCallback } from 'react';
import { useSaveChannelContent } from './useContent';
import type { ChannelType } from '../../../lib/content-types';

const DEBOUNCE_MS = 600;

/**
 * Debounced channel content save — prevents race conditions from rapid editing.
 * Replaces direct useSaveChannelContent().mutate() calls in channel panels.
 */
export function useDebouncedSave(contentId: string, channel: ChannelType) {
  const saveChannel = useSaveChannelContent();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const latestData = useRef<{ channelContentId: string; data: unknown }>();

  const save = useCallback(
    (channelContentId: string, data: unknown) => {
      latestData.current = { channelContentId, data };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const latest = latestData.current;
        if (!latest) return;
        saveChannel.mutate({
          id: contentId,
          channel,
          channelContentId: latest.channelContentId,
          data: latest.data,
        });
      }, DEBOUNCE_MS);
    },
    [contentId, channel, saveChannel],
  );

  // Immediate save (for explicit save actions, not typing)
  const saveNow = useCallback(
    (channelContentId: string, data: unknown) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      saveChannel.mutate({
        id: contentId,
        channel,
        channelContentId,
        data,
      });
    },
    [contentId, channel, saveChannel],
  );

  return { save, saveNow, isSaving: saveChannel.isPending };
}
