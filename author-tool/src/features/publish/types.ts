export type PublishChannel = 'instagram' | 'wordpress' | 'threads' | 'youtube';
export type PublishStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export interface PublishJob {
  id: string;
  project_id: string;
  content_id: string;
  content_title: string | null;
  channel: PublishChannel;
  status: PublishStatus;
  scheduled_at: string;
  published_at: string | null;
  payload: Record<string, unknown>;
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
  payload: Record<string, unknown>;
}
