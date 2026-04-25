import * as comments from './monitored-comments.service.js';
import * as instagram from './instagram.service.js';

export interface SyncResult {
  channel: 'instagram' | 'youtube';
  fetched: number;
  created: number;
  updated: number;
  message?: string;
}

export async function syncInstagram(projectId: string, mediaLimit = 25): Promise<SyncResult> {
  if (!instagram.isConfigured()) {
    return { channel: 'instagram', fetched: 0, created: 0, updated: 0, message: 'Instagram 미설정' };
  }
  const fetched = await instagram.fetchAllRecentComments(mediaLimit);
  if (fetched.length === 0) {
    return { channel: 'instagram', fetched: 0, created: 0, updated: 0, message: '최근 댓글 없음' };
  }
  const before = new Set(
    (await comments.listComments({ projectId, channel: 'instagram', limit: 1000 }))
      .map((c) => c.external_id)
  );
  await comments.upsertComments(
    fetched.map((c) => ({
      projectId,
      channel: 'instagram' as const,
      externalId: c.id,
      postId: c.mediaId,
      postTitle: c.mediaCaption?.slice(0, 120),
      postUrl: c.mediaPermalink,
      author: c.username,
      text: c.text,
      likeCount: c.likeCount,
      createdAtExternal: c.timestamp,
    }))
  );
  const created = fetched.filter((c) => !before.has(c.id)).length;
  return {
    channel: 'instagram',
    fetched: fetched.length,
    created,
    updated: fetched.length - created,
  };
}

export async function syncAll(projectId: string): Promise<SyncResult[]> {
  const tasks: Array<Promise<SyncResult>> = [];
  if (instagram.isConfigured()) tasks.push(syncInstagram(projectId));
  // YouTube: 추후 연동 (project-level channelId + YOUTUBE_API_KEY 필요)
  const results = await Promise.all(tasks);
  return results;
}
