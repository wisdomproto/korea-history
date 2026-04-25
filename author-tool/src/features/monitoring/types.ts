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

export interface SyncResult {
  channel: CommentChannel;
  fetched: number;
  created: number;
  updated: number;
  message?: string;
}

export interface CommentSummary {
  total: number;
  byStatus: Record<ReplyStatus, number>;
  bySentiment: Record<CommentSentiment | 'unknown', number>;
  byChannel: Record<CommentChannel, number>;
}
