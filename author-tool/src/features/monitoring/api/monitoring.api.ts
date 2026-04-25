import axios from 'axios';
import type {
  MonitoredComment,
  CommentSummary,
  SyncResult,
  CommentChannel,
  CommentSentiment,
  ReplyStatus,
} from '../types';

export async function listComments(filter: {
  projectId: string;
  channel?: CommentChannel;
  sentiment?: CommentSentiment;
  replyStatus?: ReplyStatus;
}): Promise<MonitoredComment[]> {
  const params = new URLSearchParams();
  params.set('projectId', filter.projectId);
  if (filter.channel) params.set('channel', filter.channel);
  if (filter.sentiment) params.set('sentiment', filter.sentiment);
  if (filter.replyStatus) params.set('replyStatus', filter.replyStatus);
  const res = await axios.get(`/api/comments?${params.toString()}`);
  return (res.data.data ?? []) as MonitoredComment[];
}

export async function fetchSummary(projectId: string): Promise<CommentSummary | null> {
  const res = await axios.get(`/api/comments/summary?projectId=${projectId}`);
  return (res.data.data ?? null) as CommentSummary | null;
}

export async function syncComments(projectId: string, channel?: CommentChannel): Promise<SyncResult[]> {
  const res = await axios.post('/api/comments/sync', { projectId, channel });
  return (res.data.data ?? []) as SyncResult[];
}

export async function analyzeComment(id: string): Promise<MonitoredComment> {
  const res = await axios.post(`/api/comments/${id}/analyze`);
  return res.data.data as MonitoredComment;
}

export async function analyzeBatch(projectId: string, limit = 20): Promise<{ processed: number; done: number; failed: number }> {
  const res = await axios.post('/api/comments/analyze-batch', { projectId, limit });
  return res.data.data;
}

export async function replyComment(id: string, message: string): Promise<MonitoredComment> {
  const res = await axios.post(`/api/comments/${id}/reply`, { message });
  return res.data.data as MonitoredComment;
}

export async function ignoreComment(id: string): Promise<MonitoredComment> {
  const res = await axios.post(`/api/comments/${id}/ignore`);
  return res.data.data as MonitoredComment;
}

export async function updateDraft(id: string, draft: string): Promise<MonitoredComment> {
  const res = await axios.patch(`/api/comments/${id}`, { ai_reply_draft: draft });
  return res.data.data as MonitoredComment;
}
