import axios from 'axios';
import type { AdCampaign, AdSummary, CreateCampaignInput, AdPlatform, AdStatus } from '../types';

export async function listCampaigns(filter: {
  projectId: string;
  platform?: AdPlatform;
  status?: AdStatus;
}): Promise<AdCampaign[]> {
  const params = new URLSearchParams();
  params.set('projectId', filter.projectId);
  if (filter.platform) params.set('platform', filter.platform);
  if (filter.status) params.set('status', filter.status);
  const res = await axios.get(`/api/ad-campaigns?${params.toString()}`);
  return (res.data.data ?? []) as AdCampaign[];
}

export async function fetchSummary(projectId: string): Promise<AdSummary | null> {
  const res = await axios.get(`/api/ad-campaigns/summary?projectId=${projectId}`);
  return (res.data.data ?? null) as AdSummary | null;
}

export async function createCampaign(input: CreateCampaignInput): Promise<AdCampaign> {
  const res = await axios.post('/api/ad-campaigns', input);
  return res.data.data as AdCampaign;
}

export async function updateCampaign(id: string, patch: Partial<AdCampaign>): Promise<AdCampaign> {
  const res = await axios.patch(`/api/ad-campaigns/${id}`, patch);
  return res.data.data as AdCampaign;
}

export async function deleteCampaign(id: string): Promise<void> {
  await axios.delete(`/api/ad-campaigns/${id}`);
}
