import * as jobs from './publish-job.service.js';
import * as instagram from './instagram.service.js';
import * as wp from './wordpress.service.js';
import { getProject } from './project.service.js';

export interface PublishExecution {
  ok: boolean;
  resultUrl?: string;
  resultId?: string;
  errorMessage?: string;
}

export async function executeJob(job: jobs.PublishJob): Promise<PublishExecution> {
  try {
    if (job.channel === 'instagram') {
      const p = job.payload as jobs.InstagramPayload;
      if (!p?.imageUrls?.length) throw new Error('imageUrls가 비어있습니다');
      const res = await instagram.publishToInstagram(p.imageUrls, p.caption ?? '');
      return { ok: true, resultId: res.mediaId, resultUrl: res.permalink ?? undefined };
    }
    if (job.channel === 'wordpress') {
      const p = job.payload as jobs.WordPressPayload;
      const project = await getProject(job.project_id);
      const creds = project?.channelCredentials?.wordpress;
      if (!creds?.siteUrl || !creds?.username || !creds?.appPassword) {
        throw new Error('WordPress 자격증명이 설정되지 않았습니다 (프로젝트 설정 → API·연동 탭)');
      }
      const res = await wp.createPost(
        { siteUrl: creds.siteUrl, username: creds.username, appPassword: creds.appPassword },
        {
          title: p.title,
          html: p.html,
          status: p.status ?? 'publish',
          categories: p.categories,
          tags: p.tags,
          excerpt: p.excerpt,
        }
      );
      return { ok: true, resultId: String(res.id), resultUrl: res.link };
    }
    throw new Error(`${job.channel} 발행은 아직 지원되지 않습니다`);
  } catch (err) {
    return { ok: false, errorMessage: (err as Error).message };
  }
}

export async function processDueJobs(now = new Date()): Promise<{ picked: number; ok: number; failed: number }> {
  if (!jobs.isConfigured()) return { picked: 0, ok: 0, failed: 0 };
  const claimed = await jobs.claimDueJobs(now);
  let ok = 0;
  let failed = 0;
  for (const job of claimed) {
    const res = await executeJob(job);
    if (res.ok) {
      await jobs.updateJob(job.id, {
        status: 'published',
        published_at: new Date().toISOString(),
        result_url: res.resultUrl ?? null,
        result_id: res.resultId ?? null,
        attempts: (job.attempts ?? 0) + 1,
      });
      ok++;
    } else {
      await jobs.updateJob(job.id, {
        status: 'failed',
        error_message: res.errorMessage ?? '알 수 없는 오류',
        attempts: (job.attempts ?? 0) + 1,
      });
      failed++;
    }
  }
  return { picked: claimed.length, ok, failed };
}

export async function retryJob(id: string, scheduledAt?: string): Promise<jobs.PublishJob | null> {
  return jobs.updateJob(id, {
    status: 'scheduled',
    scheduled_at: scheduledAt ?? new Date().toISOString(),
    error_message: null,
  });
}

export async function publishNow(job: jobs.PublishJob): Promise<PublishExecution> {
  const res = await executeJob(job);
  if (res.ok) {
    await jobs.updateJob(job.id, {
      status: 'published',
      published_at: new Date().toISOString(),
      result_url: res.resultUrl ?? null,
      result_id: res.resultId ?? null,
      attempts: (job.attempts ?? 0) + 1,
    });
  } else {
    await jobs.updateJob(job.id, {
      status: 'failed',
      error_message: res.errorMessage ?? '알 수 없는 오류',
      attempts: (job.attempts ?? 0) + 1,
    });
  }
  return res;
}
