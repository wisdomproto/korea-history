import {
  isConfigured as isR2Configured,
  readJson,
  mutateList,
  patchById,
  removeById,
  withLock,
} from './r2-json.service.js';

export type PublishChannel = 'instagram' | 'wordpress' | 'threads' | 'youtube';
export type PublishStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export interface InstagramPayload {
  imageUrls: string[];
  caption: string;
}

export interface WordPressPayload {
  title: string;
  html: string;
  categories?: number[];
  tags?: string[];
  status?: 'publish' | 'draft' | 'future';
  featuredMediaUrl?: string;
  excerpt?: string;
}

export type JobPayload = InstagramPayload | WordPressPayload | Record<string, unknown>;

export interface PublishJob {
  id: string;
  project_id: string;
  content_id: string;
  content_title: string | null;
  channel: PublishChannel;
  status: PublishStatus;
  scheduled_at: string;
  published_at: string | null;
  payload: JobPayload;
  result_url: string | null;
  result_id: string | null;
  error_message: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface CreateJobInput {
  projectId: string;
  contentId: string;
  contentTitle?: string;
  channel: PublishChannel;
  scheduledAt: string;
  payload: JobPayload;
}

const R2_KEY = 'author-tool/publish-jobs/index.json';

export function isConfigured(): boolean {
  return isR2Configured();
}

function makeId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string { return new Date().toISOString(); }

export async function createJob(input: CreateJobInput): Promise<PublishJob> {
  const job: PublishJob = {
    id: makeId(),
    project_id: input.projectId,
    content_id: input.contentId,
    content_title: input.contentTitle ?? null,
    channel: input.channel,
    status: 'scheduled',
    scheduled_at: input.scheduledAt,
    published_at: null,
    payload: input.payload,
    result_url: null,
    result_id: null,
    error_message: null,
    attempts: 0,
    created_at: now(),
    updated_at: now(),
  };
  await mutateList<PublishJob>(R2_KEY, (list) => [job, ...list]);
  return job;
}

export async function listJobs(filter?: {
  projectId?: string;
  status?: PublishStatus;
  channel?: PublishChannel;
  limit?: number;
}): Promise<PublishJob[]> {
  let list = await readJson<PublishJob[]>(R2_KEY, []);
  if (filter?.projectId) list = list.filter((j) => j.project_id === filter.projectId);
  if (filter?.status) list = list.filter((j) => j.status === filter.status);
  if (filter?.channel) list = list.filter((j) => j.channel === filter.channel);
  list = list
    .slice()
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  if (filter?.limit) list = list.slice(0, filter.limit);
  return list;
}

export async function getJob(id: string): Promise<PublishJob | null> {
  const list = await readJson<PublishJob[]>(R2_KEY, []);
  return list.find((j) => j.id === id) ?? null;
}

export async function updateJob(id: string, patch: Partial<PublishJob>): Promise<PublishJob | null> {
  const allowed: Array<keyof PublishJob> = [
    'status', 'published_at', 'result_url', 'result_id',
    'error_message', 'attempts', 'scheduled_at', 'payload',
  ];
  const safePatch: Partial<PublishJob> = {};
  for (const k of allowed) {
    if (k in patch) (safePatch as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
  }
  safePatch.updated_at = now();
  return patchById<PublishJob>(R2_KEY, id, safePatch);
}

export async function cancelJob(id: string): Promise<PublishJob | null> {
  return updateJob(id, { status: 'cancelled' });
}

export async function deleteJob(id: string): Promise<boolean> {
  await removeById<PublishJob>(R2_KEY, id);
  return true;
}

/**
 * Atomically flip due scheduled jobs → 'publishing'. Returns the claimed set.
 * Safe under single-process assumption (one cron + one author).
 */
export async function claimDueJobs(now: Date = new Date()): Promise<PublishJob[]> {
  return withLock<PublishJob[]>(R2_KEY, async () => {
    const list = await readJson<PublishJob[]>(R2_KEY, []);
    const claimed: PublishJob[] = [];
    const next = list.map((j) => {
      if (j.status === 'scheduled' && new Date(j.scheduled_at) <= now) {
        const updated: PublishJob = { ...j, status: 'publishing', updated_at: new Date().toISOString() };
        claimed.push(updated);
        return updated;
      }
      return j;
    });
    if (claimed.length > 0) {
      const { writeJson } = await import('./r2-json.service.js');
      await writeJson(R2_KEY, next);
    }
    return claimed;
  });
}
