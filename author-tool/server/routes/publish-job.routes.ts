import { Router } from 'express';
import * as jobs from '../services/publish-job.service.js';
import * as publisher from '../services/publisher.service.js';
import * as wp from '../services/wordpress.service.js';
import { getProject } from '../services/project.service.js';

const router = Router();

function assertConfigured(res: import('express').Response): boolean {
  if (!jobs.isConfigured()) {
    res.status(503).json({
      success: false,
      error: 'R2가 설정되지 않았습니다. R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY를 확인하세요.',
    });
    return false;
  }
  return true;
}

// GET /api/publish-jobs?projectId=...&status=...&channel=...&limit=...
router.get('/', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const data = await jobs.listJobs({
      projectId: req.query.projectId as string | undefined,
      status: req.query.status as jobs.PublishStatus | undefined,
      channel: req.query.channel as jobs.PublishChannel | undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /api/publish-jobs
// body: { projectId, contentId, contentTitle?, channel, scheduledAt, payload }
router.post('/', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const { projectId, contentId, contentTitle, channel, scheduledAt, payload } = req.body;
    if (!projectId || !contentId || !channel || !scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'projectId, contentId, channel, scheduledAt required',
      });
    }
    const job = await jobs.createJob({
      projectId,
      contentId,
      contentTitle,
      channel,
      scheduledAt,
      payload: payload ?? {},
    });
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// POST /api/publish-jobs/:id/retry
router.post('/:id/retry', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const { scheduledAt } = req.body ?? {};
    const job = await publisher.retryJob(req.params.id, scheduledAt);
    if (!job) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// POST /api/publish-jobs/:id/publish-now
router.post('/:id/publish-now', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const job = await jobs.getJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Not found' });
    if (job.status === 'publishing') {
      return res.status(400).json({ success: false, error: 'Already publishing' });
    }
    const exec = await publisher.publishNow({ ...job, status: 'publishing' });
    const updated = await jobs.getJob(job.id);
    res.json({ success: exec.ok, data: updated, error: exec.errorMessage });
  } catch (err) { next(err); }
});

// POST /api/publish-jobs/:id/cancel
router.post('/:id/cancel', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const job = await jobs.cancelJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// DELETE /api/publish-jobs/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    await jobs.deleteJob(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/publish-jobs/test-wordpress
// body: { projectId }
router.post('/test-wordpress', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const project = await getProject(projectId);
    const creds = project?.channelCredentials?.wordpress;
    if (!creds?.siteUrl || !creds?.username || !creds?.appPassword) {
      return res.json({ success: false, error: 'WordPress 자격증명이 없습니다' });
    }
    const result = await wp.testConnection({
      siteUrl: creds.siteUrl,
      username: creds.username,
      appPassword: creds.appPassword,
    });
    res.json({ success: result.ok, data: result });
  } catch (err) { next(err); }
});

export default router;
