import { config } from '../config.js';
import { putObject, getPublicUrl } from './r2.service.js';

function graphUrl(pathname: string): string {
  return `https://graph.facebook.com/${config.instagram.graphVersion}${pathname}`;
}

async function fbGet(pathname: string, params: Record<string, string>): Promise<any> {
  const url = new URL(graphUrl(pathname));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Graph GET ${pathname} failed (${res.status})`);
  return data;
}

async function fbPost(pathname: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams(params);
  const res = await fetch(graphUrl(pathname), { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Graph POST ${pathname} failed (${res.status})`);
  return data;
}

async function waitContainerReady(containerId: string, token: string, maxWaitMs = 90000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const res = await fbGet(`/${containerId}`, {
      fields: 'status_code,status',
      access_token: token,
    });
    if (res.status_code === 'FINISHED') return;
    if (res.status_code === 'ERROR' || res.status_code === 'EXPIRED') {
      throw new Error(`Media container ${res.status_code}: ${res.status || ''}`);
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error('Media processing timeout');
}

export async function uploadBuffersToR2(
  buffers: Buffer[],
  contentId: string,
): Promise<string[]> {
  const stamp = Date.now();
  const urls: string[] = [];
  // Meta(IG) blocks pub-*.r2.dev fetches. When CDN_BASE_URL is set, route through
  // the author-tool /r2 proxy (e.g. https://korea-history-production.up.railway.app/r2/...)
  // so Meta sees a public host it accepts.
  const cdnBase = process.env.CDN_BASE_URL?.trim().replace(/\/$/, '') || '';
  for (let i = 0; i < buffers.length; i++) {
    const key = `published/instagram/${contentId}/${stamp}/${String(i + 1).padStart(2, '0')}.png`;
    await putObject(key, buffers[i], 'image/png');
    urls.push(cdnBase ? `${cdnBase}/r2/${key}` : getPublicUrl(key));
  }
  return urls;
}

export interface PublishResult {
  mediaId: string;
  permalink: string | null;
  imageUrls: string[];
}

export async function publishToInstagram(
  imageUrls: string[],
  caption: string,
): Promise<Omit<PublishResult, 'imageUrls'>> {
  const { userId, accessToken } = config.instagram;
  if (!userId || !accessToken) {
    throw new Error('Instagram 미설정: INSTAGRAM_USER_ID / INSTAGRAM_ACCESS_TOKEN 환경변수를 설정하세요.');
  }
  if (imageUrls.length === 0) throw new Error('발행할 이미지가 없습니다.');
  if (imageUrls.length > 10) throw new Error('인스타그램 캐러셀은 최대 10장입니다.');

  // Single image
  if (imageUrls.length === 1) {
    const container = await fbPost(`/${userId}/media`, {
      image_url: imageUrls[0],
      caption,
      access_token: accessToken,
    });
    await waitContainerReady(container.id, accessToken);
    const published = await fbPost(`/${userId}/media_publish`, {
      creation_id: container.id,
      access_token: accessToken,
    });
    return { mediaId: published.id, permalink: await fetchPermalink(published.id) };
  }

  // Carousel (multi-image)
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const child = await fbPost(`/${userId}/media`, {
      image_url: url,
      is_carousel_item: 'true',
      access_token: accessToken,
    });
    childIds.push(child.id);
  }
  for (const id of childIds) await waitContainerReady(id, accessToken);

  const parent = await fbPost(`/${userId}/media`, {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
    access_token: accessToken,
  });
  await waitContainerReady(parent.id, accessToken);

  const published = await fbPost(`/${userId}/media_publish`, {
    creation_id: parent.id,
    access_token: accessToken,
  });
  return { mediaId: published.id, permalink: await fetchPermalink(published.id) };
}

async function fetchPermalink(mediaId: string): Promise<string | null> {
  try {
    const res = await fbGet(`/${mediaId}`, {
      fields: 'permalink',
      access_token: config.instagram.accessToken,
    });
    return res.permalink || null;
  } catch {
    return null;
  }
}

export function isConfigured(): boolean {
  return !!(config.instagram.userId && config.instagram.accessToken);
}

// ─── Comment monitoring ───

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
  media_type?: string;
}

export interface InstagramCommentItem {
  id: string;
  mediaId: string;
  mediaCaption?: string;
  mediaPermalink?: string;
  text: string;
  username: string;
  timestamp: string;
  likeCount: number;
}

export async function listRecentMedia(limit = 25): Promise<InstagramMediaItem[]> {
  if (!isConfigured()) return [];
  const { userId, accessToken } = config.instagram;
  const data = await fbGet(`/${userId}/media`, {
    fields: 'id,caption,permalink,timestamp,media_type',
    limit: String(limit),
    access_token: accessToken,
  });
  return (data?.data ?? []) as InstagramMediaItem[];
}

export async function listCommentsForMedia(
  mediaId: string,
  mediaMeta?: { caption?: string; permalink?: string }
): Promise<InstagramCommentItem[]> {
  if (!isConfigured()) return [];
  const { accessToken } = config.instagram;
  const data = await fbGet(`/${mediaId}/comments`, {
    fields: 'id,text,username,timestamp,like_count',
    access_token: accessToken,
  });
  const rows = (data?.data ?? []) as Array<{
    id: string; text: string; username: string; timestamp: string; like_count?: number;
  }>;
  return rows.map((c) => ({
    id: c.id,
    mediaId,
    mediaCaption: mediaMeta?.caption,
    mediaPermalink: mediaMeta?.permalink,
    text: c.text,
    username: c.username,
    timestamp: c.timestamp,
    likeCount: c.like_count ?? 0,
  }));
}

export async function fetchAllRecentComments(mediaLimit = 25): Promise<InstagramCommentItem[]> {
  const media = await listRecentMedia(mediaLimit);
  const all: InstagramCommentItem[] = [];
  for (const m of media) {
    try {
      const comments = await listCommentsForMedia(m.id, { caption: m.caption, permalink: m.permalink });
      all.push(...comments);
    } catch (err) {
      // Some media types (IGTV/Reels legacy) may not expose comments — skip.
      console.warn(`[instagram] comments fetch failed for media ${m.id}:`, (err as Error).message);
    }
  }
  return all;
}

export async function replyToComment(commentId: string, message: string): Promise<string> {
  if (!isConfigured()) throw new Error('Instagram 미설정');
  const { accessToken } = config.instagram;
  const res = await fbPost(`/${commentId}/replies`, {
    message,
    access_token: accessToken,
  });
  return res.id as string;
}

// ─── Account Insights ───

export interface InstagramAccountSnapshot {
  id: string;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
}

export interface InstagramAccountInsight {
  metric: string;
  values: Array<{ value: number; endTime?: string }>;
  total: number;
}

export async function getAccountSnapshot(): Promise<InstagramAccountSnapshot | null> {
  if (!isConfigured()) return null;
  const { userId, accessToken } = config.instagram;
  const data = await fbGet(`/${userId}`, {
    fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count',
    access_token: accessToken,
  });
  return {
    id: data.id,
    username: data.username,
    name: data.name,
    profilePictureUrl: data.profile_picture_url,
    followersCount: Number(data.followers_count ?? 0),
    followsCount: Number(data.follows_count ?? 0),
    mediaCount: Number(data.media_count ?? 0),
  };
}

export async function getAccountInsights(days = 14): Promise<InstagramAccountInsight[]> {
  if (!isConfigured()) return [];
  const { userId, accessToken } = config.instagram;

  const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  const until = Math.floor(Date.now() / 1000);

  // Account-level insights — metrics depend on account type & permissions.
  // Common available metrics: reach, impressions, profile_views, accounts_engaged
  const tryMetrics = ['reach', 'profile_views', 'accounts_engaged', 'follower_count'];
  const results: InstagramAccountInsight[] = [];

  for (const metric of tryMetrics) {
    try {
      const data = await fbGet(`/${userId}/insights`, {
        metric,
        period: 'day',
        since: String(since),
        until: String(until),
        access_token: accessToken,
      });
      const series = (data?.data?.[0]?.values ?? []) as Array<{ value: number; end_time?: string }>;
      const total = series.reduce((a, b) => a + Number(b.value ?? 0), 0);
      results.push({
        metric,
        values: series.map((v) => ({ value: Number(v.value ?? 0), endTime: v.end_time })),
        total,
      });
    } catch (err) {
      // Skip unavailable metrics rather than failing the whole call.
      console.warn(`[instagram insights] ${metric} unavailable:`, (err as Error).message);
    }
  }
  return results;
}

// ─── Media Insights ───

export interface InstagramMediaWithInsights {
  id: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
  mediaType?: string;
  mediaProductType?: string;
  thumbnailUrl?: string;
  insights: {
    reach?: number;
    impressions?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    shares?: number;
    plays?: number;
  };
}

export async function getMediaInsights(mediaId: string, mediaType?: string): Promise<InstagramMediaWithInsights['insights']> {
  if (!isConfigured()) return {};
  const { accessToken } = config.instagram;
  const isVideo = mediaType === 'VIDEO' || mediaType === 'REELS';
  const metrics = isVideo
    ? ['reach', 'plays', 'likes', 'comments', 'saved', 'shares']
    : ['reach', 'impressions', 'likes', 'comments', 'saved', 'shares'];

  try {
    const data = await fbGet(`/${mediaId}/insights`, {
      metric: metrics.join(','),
      access_token: accessToken,
    });
    const out: InstagramMediaWithInsights['insights'] = {};
    for (const row of (data?.data ?? []) as Array<{ name: string; values?: Array<{ value: number }> }>) {
      const v = Number(row.values?.[0]?.value ?? 0);
      if (row.name === 'reach') out.reach = v;
      else if (row.name === 'impressions') out.impressions = v;
      else if (row.name === 'likes') out.likes = v;
      else if (row.name === 'comments') out.comments = v;
      else if (row.name === 'saved') out.saves = v;
      else if (row.name === 'shares') out.shares = v;
      else if (row.name === 'plays') out.plays = v;
    }
    return out;
  } catch (err) {
    console.warn(`[instagram media insights] ${mediaId}:`, (err as Error).message);
    return {};
  }
}

export async function listMediaWithInsights(limit = 12): Promise<InstagramMediaWithInsights[]> {
  if (!isConfigured()) return [];
  const { userId, accessToken } = config.instagram;
  const data = await fbGet(`/${userId}/media`, {
    fields: 'id,caption,permalink,timestamp,media_type,media_product_type,thumbnail_url,media_url',
    limit: String(limit),
    access_token: accessToken,
  });
  const items = (data?.data ?? []) as Array<{
    id: string; caption?: string; permalink?: string; timestamp?: string;
    media_type?: string; media_product_type?: string;
    thumbnail_url?: string; media_url?: string;
  }>;
  const enriched: InstagramMediaWithInsights[] = [];
  for (const m of items) {
    const insights = await getMediaInsights(m.id, m.media_type);
    enriched.push({
      id: m.id,
      caption: m.caption,
      permalink: m.permalink,
      timestamp: m.timestamp,
      mediaType: m.media_type,
      mediaProductType: m.media_product_type,
      thumbnailUrl: m.thumbnail_url ?? m.media_url,
      insights,
    });
  }
  return enriched;
}
