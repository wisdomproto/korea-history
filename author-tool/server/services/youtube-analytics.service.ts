import { config } from '../config.js';
import { getProject } from './project.service.js';

export interface YouTubeChannelSnapshot {
  channelId: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export interface YouTubeVideoSnapshot {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration?: string;
}

function getApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY ?? process.env.YOUTUBE_DATA_API_KEY ?? null;
}

export function isConfigured(): boolean {
  return !!getApiKey();
}

async function ytGet(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('YOUTUBE_API_KEY 미설정');
  const url = new URL(`https://www.googleapis.com/youtube/v3${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

export async function getChannelByHandle(handle: string): Promise<string | null> {
  // forHandle expects "@xxx" or "xxx"
  const clean = handle.startsWith('@') ? handle : `@${handle}`;
  try {
    const data = await ytGet('/channels', { part: 'id', forHandle: clean });
    const items = (data.items as Array<{ id: string }> | undefined) ?? [];
    return items[0]?.id ?? null;
  } catch (err) {
    console.warn('[youtube] handle lookup failed:', (err as Error).message);
    return null;
  }
}

export async function getChannelSnapshot(channelId: string): Promise<YouTubeChannelSnapshot | null> {
  const data = await ytGet('/channels', {
    part: 'snippet,statistics',
    id: channelId,
  });
  const items = (data.items as Array<{
    id: string;
    snippet: { title: string; description: string; thumbnails: { default?: { url: string } } };
    statistics: { subscriberCount: string; viewCount: string; videoCount: string };
  }> | undefined) ?? [];
  const c = items[0];
  if (!c) return null;
  return {
    channelId: c.id,
    title: c.snippet.title,
    description: c.snippet.description,
    thumbnailUrl: c.snippet.thumbnails?.default?.url,
    subscriberCount: Number(c.statistics.subscriberCount ?? 0),
    viewCount: Number(c.statistics.viewCount ?? 0),
    videoCount: Number(c.statistics.videoCount ?? 0),
  };
}

export async function listRecentVideos(channelId: string, limit = 12): Promise<YouTubeVideoSnapshot[]> {
  // Get uploads playlist via channel.contentDetails
  const ch = await ytGet('/channels', { part: 'contentDetails', id: channelId });
  const uploads = ((ch.items as Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }> | undefined) ?? [])[0]
    ?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];

  const playlist = await ytGet('/playlistItems', {
    part: 'contentDetails',
    playlistId: uploads,
    maxResults: String(Math.min(limit, 50)),
  });
  const videoIds = ((playlist.items as Array<{ contentDetails: { videoId: string } }> | undefined) ?? [])
    .map((i) => i.contentDetails.videoId);
  if (videoIds.length === 0) return [];

  const stats = await ytGet('/videos', {
    part: 'snippet,statistics,contentDetails',
    id: videoIds.join(','),
  });
  return ((stats.items as Array<{
    id: string;
    snippet: { title: string; publishedAt: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
    contentDetails: { duration?: string };
  }> | undefined) ?? []).map((v) => ({
    videoId: v.id,
    title: v.snippet.title,
    publishedAt: v.snippet.publishedAt,
    thumbnailUrl: v.snippet.thumbnails?.medium?.url ?? v.snippet.thumbnails?.default?.url,
    viewCount: Number(v.statistics.viewCount ?? 0),
    likeCount: Number(v.statistics.likeCount ?? 0),
    commentCount: Number(v.statistics.commentCount ?? 0),
    duration: v.contentDetails.duration,
  }));
}

export interface YouTubeAnalyticsSnapshot {
  channel: YouTubeChannelSnapshot | null;
  videos: YouTubeVideoSnapshot[];
}

export async function getProjectYoutubeSnapshot(projectId: string): Promise<YouTubeAnalyticsSnapshot | null> {
  if (!isConfigured()) return null;
  const project = await getProject(projectId);
  // Look for YouTube channel ID in project channelCredentials
  const cred = (project?.channelCredentials as Record<string, unknown> | undefined)?.youtube as
    { channelId?: string; handle?: string } | undefined;
  let channelId = cred?.channelId;
  if (!channelId && cred?.handle) {
    channelId = (await getChannelByHandle(cred.handle)) ?? undefined;
  }
  if (!channelId) return null;
  const channel = await getChannelSnapshot(channelId);
  const videos = channel ? await listRecentVideos(channel.channelId, 12) : [];
  return { channel, videos };
}

// Avoid unused import warning
void config;
