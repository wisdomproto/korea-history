import axios from 'axios';
import type {
  ResearchResponse,
  GoogleResearchResponse,
  GoldenAnalysisResponse,
  GscOpportunitiesResponse,
  GeneratedIdea,
  IdeaChannel,
} from '../types';

export async function researchKeywords(seed: string, context?: string, limit = 15): Promise<ResearchResponse> {
  const res = await axios.post('/api/blog-tools/research', { seed, context, limit });
  return res.data.data as ResearchResponse;
}

export async function researchGoogleKeywords(seed: string, context?: string, limit = 15): Promise<GoogleResearchResponse> {
  const res = await axios.post('/api/google-tools/research', { seed, context, limit });
  return res.data.data as GoogleResearchResponse;
}

export async function analyzeGoldenKeywords(args: {
  source: 'naver' | 'google';
  projectId?: string;
  keywords: Array<{ keyword: string; totalVolume: number; competition: string }>;
  instruction?: string;
}): Promise<GoldenAnalysisResponse> {
  const res = await axios.post('/api/blog-tools/golden-keywords', args);
  return res.data.data as GoldenAnalysisResponse;
}

export async function fetchGscOpportunities(start: string, end: string, minImpressions = 10, maxPosition = 30) {
  const res = await axios.post('/api/blog-tools/gsc-opportunities', {
    start,
    end,
    minImpressions,
    maxPosition,
  });
  return (res.data.data ?? null) as GscOpportunitiesResponse | null;
}

export async function generateIdeas(
  projectId: string,
  keywords: string[],
  opts?: { count?: number; channel?: IdeaChannel; instruction?: string }
): Promise<GeneratedIdea[]> {
  const res = await axios.post('/api/ideas/generate', {
    projectId,
    keywords,
    count: opts?.count,
    channel: opts?.channel,
    instruction: opts?.instruction,
  });
  return res.data.data as GeneratedIdea[];
}
