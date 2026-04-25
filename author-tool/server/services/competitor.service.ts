import {
  isConfigured as isR2Configured,
  readJson,
  mutateList,
  patchById,
  removeById,
} from './r2-json.service.js';

export type CompetitorChannelType = 'website' | 'blog' | 'youtube' | 'instagram' | 'threads';

export interface CompetitorChannel {
  id: string;
  type: CompetitorChannelType;
  url: string;
  identifier?: string;     // YouTube channel ID, IG username, etc. (extracted/manual)
  lastSyncedAt?: string;
}

export interface CompetitorContent {
  id: string;
  channelId: string;
  channelType: CompetitorChannelType;
  externalId?: string;     // video ID, post slug, etc.
  url?: string;
  title: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  // Engagement (best effort, channel-dependent)
  views?: number;
  likes?: number;
  comments?: number;
  // AI-derived
  topics?: string[];
  keywords?: string[];
}

export interface Competitor {
  id: string;
  project_id: string;
  name: string;
  notes?: string;
  tags?: string[];
  channels: CompetitorChannel[];
  contents: CompetitorContent[];
  // AI-derived
  topic_clusters?: string[];     // e.g. ['고려사 인물', '조선 후기 정치']
  // Metadata
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCompetitorInput {
  projectId: string;
  name: string;
  notes?: string;
  tags?: string[];
  channels?: Array<Pick<CompetitorChannel, 'type' | 'url' | 'identifier'>>;
}

const R2_KEY = 'author-tool/competitors/index.json';

export function isConfigured(): boolean {
  return isR2Configured();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string { return new Date().toISOString(); }

export async function createCompetitor(input: CreateCompetitorInput): Promise<Competitor> {
  const c: Competitor = {
    id: makeId('comp'),
    project_id: input.projectId,
    name: input.name,
    notes: input.notes,
    tags: input.tags ?? [],
    channels: (input.channels ?? []).map((ch) => ({
      id: makeId('ch'),
      type: ch.type,
      url: ch.url,
      identifier: ch.identifier,
    })),
    contents: [],
    created_at: now(),
    updated_at: now(),
  };
  await mutateList<Competitor>(R2_KEY, (list) => [c, ...list]);
  return c;
}

export async function listCompetitors(projectId?: string): Promise<Competitor[]> {
  let list = await readJson<Competitor[]>(R2_KEY, []);
  if (projectId) list = list.filter((c) => c.project_id === projectId);
  return list
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getCompetitor(id: string): Promise<Competitor | null> {
  const list = await readJson<Competitor[]>(R2_KEY, []);
  return list.find((c) => c.id === id) ?? null;
}

export async function updateCompetitor(id: string, patch: Partial<Competitor>): Promise<Competitor | null> {
  const allowed: Array<keyof Competitor> = [
    'name', 'notes', 'tags', 'channels', 'contents',
    'topic_clusters', 'last_synced_at',
  ];
  const safe: Partial<Competitor> = { updated_at: now() };
  for (const k of allowed) {
    if (k in patch) (safe as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
  }
  return patchById<Competitor>(R2_KEY, id, safe);
}

export async function deleteCompetitor(id: string): Promise<void> {
  await removeById<Competitor>(R2_KEY, id);
}

export async function addChannel(competitorId: string, channel: Omit<CompetitorChannel, 'id'>): Promise<Competitor | null> {
  const c = await getCompetitor(competitorId);
  if (!c) return null;
  const newChannel: CompetitorChannel = { id: makeId('ch'), ...channel };
  return updateCompetitor(competitorId, {
    channels: [...c.channels, newChannel],
  });
}

export async function removeChannel(competitorId: string, channelId: string): Promise<Competitor | null> {
  const c = await getCompetitor(competitorId);
  if (!c) return null;
  return updateCompetitor(competitorId, {
    channels: c.channels.filter((ch) => ch.id !== channelId),
    // also strip orphaned content
    contents: c.contents.filter((ct) => ct.channelId !== channelId),
  });
}
