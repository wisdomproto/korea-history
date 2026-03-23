import { useState, useCallback, useRef } from 'react';
import { generateSSE } from '../api/content.api';
import { useRefreshContent } from './useContent';

interface UseChannelGenerationOptions {
  contentId: string;
  /** SSE path segment, e.g. 'base-article/generate' or 'generate/blog' */
  path: string;
}

/**
 * Shared hook for AI channel content generation via SSE.
 * Eliminates duplicated isGenerating + generateSSE + refresh pattern across panels.
 */
export function useChannelGeneration({ contentId, path }: UseChannelGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const refreshContent = useRefreshContent();

  const generate = useCallback(
    (body: Record<string, unknown> = {}) => {
      if (isGenerating) return;
      setIsGenerating(true);
      setProgress('');

      abortRef.current = generateSSE(contentId, path, body, {
        onChunk: (content) => setProgress(content),
        onComplete: () => {
          refreshContent(contentId);
          setIsGenerating(false);
          setProgress('');
        },
        onError: (msg) => {
          alert(`생성 실패: ${msg}`);
          setIsGenerating(false);
          setProgress('');
        },
      });
    },
    [contentId, path, isGenerating, refreshContent],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setProgress('');
  }, []);

  return { isGenerating, progress, generate, abort };
}
