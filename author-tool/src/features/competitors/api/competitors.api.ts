import axios from 'axios';
import type { Competitor, CompetitorChannelType, GapAnalysis, SyncReport } from '../types';

export async function listCompetitors(projectId: string): Promise<Competitor[]> {
  const res = await axios.get(`/api/competitors?projectId=${projectId}`);
  return (res.data.data ?? []) as Competitor[];
}

export async function getCompetitor(id: string): Promise<Competitor | null> {
  const res = await axios.get(`/api/competitors/${id}`);
  return (res.data.data ?? null) as Competitor | null;
}

export async function createCompetitor(input: {
  projectId: string;
  name: string;
  notes?: string;
  tags?: string[];
  channels?: Array<{ type: CompetitorChannelType; url: string; identifier?: string }>;
}): Promise<Competitor> {
  const res = await axios.post('/api/competitors', input);
  return res.data.data as Competitor;
}

export async function updateCompetitor(id: string, patch: Partial<Competitor>): Promise<Competitor> {
  const res = await axios.patch(`/api/competitors/${id}`, patch);
  return res.data.data as Competitor;
}

export async function deleteCompetitor(id: string): Promise<void> {
  await axios.delete(`/api/competitors/${id}`);
}

export async function addChannel(
  id: string,
  channel: { type: CompetitorChannelType; url: string; identifier?: string }
): Promise<Competitor> {
  const res = await axios.post(`/api/competitors/${id}/channels`, channel);
  return res.data.data as Competitor;
}

export async function removeChannel(id: string, channelId: string): Promise<Competitor> {
  const res = await axios.delete(`/api/competitors/${id}/channels/${channelId}`);
  return res.data.data as Competitor;
}

export async function syncCompetitor(id: string): Promise<{ reports: SyncReport[]; contentCount: number }> {
  const res = await axios.post(`/api/competitors/${id}/sync`);
  return res.data.data;
}

export async function extractTopics(id: string): Promise<{ topics: string[] }> {
  const res = await axios.post(`/api/competitors/${id}/extract-topics`);
  return res.data.data;
}

export async function gapAnalysis(projectId: string): Promise<GapAnalysis> {
  const res = await axios.post('/api/competitors/gap-analysis', { projectId });
  return res.data.data as GapAnalysis;
}
