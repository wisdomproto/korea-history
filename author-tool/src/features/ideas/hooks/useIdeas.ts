import { useMutation } from '@tanstack/react-query';
import {
  researchKeywords,
  researchGoogleKeywords,
  analyzeGoldenKeywords,
  fetchGscOpportunities,
  generateIdeas,
} from '../api/ideas.api';
import type { IdeaChannel } from '../types';

export function useResearchKeywords() {
  return useMutation({
    mutationFn: ({ seed, context, limit }: { seed: string; context?: string; limit?: number }) =>
      researchKeywords(seed, context, limit),
  });
}

export function useResearchGoogleKeywords() {
  return useMutation({
    mutationFn: ({ seed, context, limit }: { seed: string; context?: string; limit?: number }) =>
      researchGoogleKeywords(seed, context, limit),
  });
}

export function useAnalyzeGolden() {
  return useMutation({
    mutationFn: (args: Parameters<typeof analyzeGoldenKeywords>[0]) => analyzeGoldenKeywords(args),
  });
}

export function useGscOpportunities() {
  return useMutation({
    mutationFn: ({ start, end, minImpressions, maxPosition }: {
      start: string;
      end: string;
      minImpressions?: number;
      maxPosition?: number;
    }) => fetchGscOpportunities(start, end, minImpressions, maxPosition),
  });
}

export function useGenerateIdeas() {
  return useMutation({
    mutationFn: ({ projectId, keywords, count, channel, instruction }: {
      projectId: string;
      keywords: string[];
      count?: number;
      channel?: IdeaChannel;
      instruction?: string;
    }) => generateIdeas(projectId, keywords, { count, channel, instruction }),
  });
}

export function useSavedKeywordIds(keywordIds?: string[]) {
  // Helper passthrough for future use
  return keywordIds ?? [];
}
