import {
  isConfigured as isR2Configured,
  readJson,
  mutateList,
  patchById,
  removeById,
} from './r2-json.service.js';

export type CommentChannel = 'instagram' | 'youtube' | 'threads' | 'naver_blog';
export type CommentSentiment = 'positive' | 'neutral' | 'negative';
export type CommentIntent = 'question' | 'complaint' | 'compliment' | 'spam' | 'other';
export type ReplyStatus = 'new' | 'drafted' | 'approved' | 'replied' | 'ignored';

export interface MonitoredComment {
  id: string;
  project_id: string;
  channel: CommentChannel;
  external_id: string;
  post_id: string;
  post_title: string | null;
  post_url: string | null;
  author: string;
  author_avatar_url: string | null;
  text: string;
  like_count: number;
  created_at_external: string | null;
  sentiment: CommentSentiment | null;
  sentiment_confidence: number | null;
  intent: CommentIntent | null;
  ai_reply_draft: string | null;
  reply_status: ReplyStatus;
  reply_text: string | null;
  replied_at: string | null;
  replied_external_id: string | null;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertCommentInput {
  projectId: string;
  channel: CommentChannel;
  externalId: string;
  postId: string;
  postTitle?: string;
  postUrl?: string;
  author: string;
  authorAvatarUrl?: string;
  text: string;
  likeCount?: number;
  createdAtExternal?: string;
}

const R2_KEY = 'author-tool/monitored-comments/index.json';

export function isConfigured(): boolean {
  return isR2Configured();
}

function makeId(): string {
  return `cm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string { return new Date().toISOString(); }

export async function upsertComments(inputs: UpsertCommentInput[]): Promise<MonitoredComment[]> {
  if (inputs.length === 0) return [];
  const timestamp = now();

  const upserted: MonitoredComment[] = [];
  await mutateList<MonitoredComment>(R2_KEY, (current) => {
    const byKey = new Map<string, number>();
    current.forEach((c, i) => byKey.set(`${c.channel}:${c.external_id}`, i));

    const next = current.slice();
    for (const input of inputs) {
      const key = `${input.channel}:${input.externalId}`;
      const existingIdx = byKey.get(key);
      if (existingIdx !== undefined) {
        const existing = next[existingIdx];
        const updated: MonitoredComment = {
          ...existing,
          text: input.text,
          like_count: input.likeCount ?? existing.like_count,
          post_title: input.postTitle ?? existing.post_title,
          post_url: input.postUrl ?? existing.post_url,
          author_avatar_url: input.authorAvatarUrl ?? existing.author_avatar_url,
          fetched_at: timestamp,
          updated_at: timestamp,
        };
        next[existingIdx] = updated;
        upserted.push(updated);
      } else {
        const fresh: MonitoredComment = {
          id: makeId(),
          project_id: input.projectId,
          channel: input.channel,
          external_id: input.externalId,
          post_id: input.postId,
          post_title: input.postTitle ?? null,
          post_url: input.postUrl ?? null,
          author: input.author,
          author_avatar_url: input.authorAvatarUrl ?? null,
          text: input.text,
          like_count: input.likeCount ?? 0,
          created_at_external: input.createdAtExternal ?? null,
          sentiment: null,
          sentiment_confidence: null,
          intent: null,
          ai_reply_draft: null,
          reply_status: 'new',
          reply_text: null,
          replied_at: null,
          replied_external_id: null,
          fetched_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
        };
        next.unshift(fresh);
        byKey.set(key, 0);
        for (const [k, idx] of byKey.entries()) {
          if (k !== key) byKey.set(k, idx + 1);
        }
        upserted.push(fresh);
      }
    }
    return next;
  });
  return upserted;
}

export interface ListFilter {
  projectId?: string;
  channel?: CommentChannel;
  sentiment?: CommentSentiment;
  replyStatus?: ReplyStatus;
  limit?: number;
}

export async function listComments(filter: ListFilter): Promise<MonitoredComment[]> {
  let list = await readJson<MonitoredComment[]>(R2_KEY, []);
  if (filter.projectId) list = list.filter((c) => c.project_id === filter.projectId);
  if (filter.channel) list = list.filter((c) => c.channel === filter.channel);
  if (filter.sentiment) list = list.filter((c) => c.sentiment === filter.sentiment);
  if (filter.replyStatus) list = list.filter((c) => c.reply_status === filter.replyStatus);
  list = list
    .slice()
    .sort((a, b) => {
      const aT = a.created_at_external ?? a.created_at;
      const bT = b.created_at_external ?? b.created_at;
      return bT.localeCompare(aT);
    });
  if (filter.limit) list = list.slice(0, filter.limit);
  return list;
}

export async function getComment(id: string): Promise<MonitoredComment | null> {
  const list = await readJson<MonitoredComment[]>(R2_KEY, []);
  return list.find((c) => c.id === id) ?? null;
}

export async function updateComment(
  id: string,
  patch: Partial<MonitoredComment>
): Promise<MonitoredComment | null> {
  const allowed: Array<keyof MonitoredComment> = [
    'sentiment', 'sentiment_confidence', 'intent', 'ai_reply_draft',
    'reply_status', 'reply_text', 'replied_at', 'replied_external_id',
  ];
  const safePatch: Partial<MonitoredComment> = {};
  for (const k of allowed) {
    if (k in patch) (safePatch as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
  }
  safePatch.updated_at = now();
  return patchById<MonitoredComment>(R2_KEY, id, safePatch);
}

export async function deleteComment(id: string): Promise<void> {
  await removeById<MonitoredComment>(R2_KEY, id);
}

export async function summarize(projectId: string): Promise<{
  total: number;
  byStatus: Record<ReplyStatus, number>;
  bySentiment: Record<CommentSentiment | 'unknown', number>;
  byChannel: Record<CommentChannel, number>;
}> {
  const comments = await listComments({ projectId, limit: 1000 });
  const byStatus = { new: 0, drafted: 0, approved: 0, replied: 0, ignored: 0 } as Record<ReplyStatus, number>;
  const bySentiment = { positive: 0, neutral: 0, negative: 0, unknown: 0 } as Record<CommentSentiment | 'unknown', number>;
  const byChannel = { instagram: 0, youtube: 0, threads: 0, naver_blog: 0 } as Record<CommentChannel, number>;
  for (const c of comments) {
    byStatus[c.reply_status]++;
    bySentiment[c.sentiment ?? 'unknown']++;
    byChannel[c.channel]++;
  }
  return { total: comments.length, byStatus, bySentiment, byChannel };
}
