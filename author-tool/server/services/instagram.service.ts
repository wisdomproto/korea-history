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
  for (let i = 0; i < buffers.length; i++) {
    const key = `published/instagram/${contentId}/${stamp}/${String(i + 1).padStart(2, '0')}.png`;
    await putObject(key, buffers[i], 'image/png');
    urls.push(getPublicUrl(key));
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
