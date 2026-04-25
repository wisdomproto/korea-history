import axios from 'axios';
import type { PublishJob, CreateJobInput, PublishStatus, PublishChannel } from '../types';

export async function listJobs(filter?: {
  projectId?: string;
  status?: PublishStatus;
  channel?: PublishChannel;
  limit?: number;
}): Promise<PublishJob[]> {
  const params = new URLSearchParams();
  if (filter?.projectId) params.set('projectId', filter.projectId);
  if (filter?.status) params.set('status', filter.status);
  if (filter?.channel) params.set('channel', filter.channel);
  if (filter?.limit) params.set('limit', String(filter.limit));
  const res = await axios.get(`/api/publish-jobs?${params.toString()}`);
  return (res.data.data ?? []) as PublishJob[];
}

export async function createJob(input: CreateJobInput): Promise<PublishJob> {
  const res = await axios.post('/api/publish-jobs', input);
  return res.data.data as PublishJob;
}

export async function cancelJob(id: string): Promise<PublishJob> {
  const res = await axios.post(`/api/publish-jobs/${id}/cancel`);
  return res.data.data as PublishJob;
}

export async function retryJob(id: string, scheduledAt?: string): Promise<PublishJob> {
  const res = await axios.post(`/api/publish-jobs/${id}/retry`, { scheduledAt });
  return res.data.data as PublishJob;
}

export async function publishNow(id: string): Promise<{ ok: boolean; data: PublishJob | null; error?: string }> {
  const res = await axios.post(`/api/publish-jobs/${id}/publish-now`);
  return { ok: !!res.data.success, data: (res.data.data ?? null) as PublishJob | null, error: res.data.error };
}

export async function deleteJob(id: string): Promise<void> {
  await axios.delete(`/api/publish-jobs/${id}`);
}

export async function testWordPress(projectId: string): Promise<{ ok: boolean; data?: { ok: boolean; user?: string; message?: string } }> {
  const res = await axios.post('/api/publish-jobs/test-wordpress', { projectId });
  return { ok: !!res.data.success, data: res.data.data };
}
