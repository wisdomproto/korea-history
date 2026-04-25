import { Router } from 'express';
import * as comments from '../services/monitored-comments.service.js';
import * as sync from '../services/comment-sync.service.js';
import * as ai from '../services/comment-ai.service.js';
import * as instagram from '../services/instagram.service.js';

const router = Router();

function assertConfigured(res: import('express').Response): boolean {
  if (!comments.isConfigured()) {
    res.status(503).json({
      success: false,
      error: 'R2가 설정되지 않았습니다. R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY를 확인하세요.',
    });
    return false;
  }
  return true;
}

// GET /api/comments?projectId=...&channel=...&sentiment=...&replyStatus=...
router.get('/', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const data = await comments.listComments({
      projectId: req.query.projectId as string | undefined,
      channel: req.query.channel as comments.CommentChannel | undefined,
      sentiment: req.query.sentiment as comments.CommentSentiment | undefined,
      replyStatus: req.query.replyStatus as comments.ReplyStatus | undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/comments/summary?projectId=...
router.get('/summary', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const projectId = req.query.projectId as string;
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const data = await comments.summarize(projectId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /api/comments/sync
// body: { projectId, channel? }
router.post('/sync', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const { projectId, channel } = req.body as {
      projectId: string;
      channel?: comments.CommentChannel;
    };
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    let results: Awaited<ReturnType<typeof sync.syncAll>> = [];
    if (!channel || channel === 'instagram') {
      results.push(await sync.syncInstagram(projectId));
    }
    // Future: YouTube / Threads
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

// POST /api/comments/:id/analyze — run Gemini sentiment + draft
router.post('/:id/analyze', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const comment = await comments.getComment(req.params.id);
    if (!comment) return res.status(404).json({ success: false, error: 'Not found' });
    const result = await ai.analyzeAndDraft(comment);
    const updated = await comments.updateComment(comment.id, {
      sentiment: result.sentiment,
      sentiment_confidence: result.sentimentConfidence,
      intent: result.intent,
      ai_reply_draft: result.replyDraft,
      reply_status: result.replyDraft.trim() ? 'drafted' : comment.reply_status,
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// POST /api/comments/analyze-batch — analyze all 'new' comments of a project
router.post('/analyze-batch', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const { projectId, limit } = req.body as { projectId: string; limit?: number };
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const news = (await comments.listComments({ projectId, replyStatus: 'new', limit: 50 }))
      .slice(0, limit ?? 20);
    let done = 0;
    let failed = 0;
    for (const c of news) {
      try {
        const result = await ai.analyzeAndDraft(c);
        await comments.updateComment(c.id, {
          sentiment: result.sentiment,
          sentiment_confidence: result.sentimentConfidence,
          intent: result.intent,
          ai_reply_draft: result.replyDraft,
          reply_status: result.replyDraft.trim() ? 'drafted' : c.reply_status,
        });
        done++;
      } catch (err) {
        console.error('[comments analyze]', c.id, (err as Error).message);
        failed++;
      }
    }
    res.json({ success: true, data: { processed: news.length, done, failed } });
  } catch (err) { next(err); }
});

// POST /api/comments/:id/reply — send reply via channel API + mark replied
router.post('/:id/reply', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const { message } = req.body as { message: string };
    if (!message?.trim()) return res.status(400).json({ success: false, error: 'message required' });
    const comment = await comments.getComment(req.params.id);
    if (!comment) return res.status(404).json({ success: false, error: 'Not found' });
    let repliedExternalId: string | null = null;
    if (comment.channel === 'instagram') {
      repliedExternalId = await instagram.replyToComment(comment.external_id, message.trim());
    } else {
      return res.status(400).json({ success: false, error: `${comment.channel} 답글 전송은 아직 지원되지 않습니다` });
    }
    const updated = await comments.updateComment(comment.id, {
      reply_status: 'replied',
      reply_text: message.trim(),
      replied_at: new Date().toISOString(),
      replied_external_id: repliedExternalId,
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// POST /api/comments/:id/ignore
router.post('/:id/ignore', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const updated = await comments.updateComment(req.params.id, { reply_status: 'ignored' });
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// PATCH /api/comments/:id — update draft manually
router.patch('/:id', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const updated = await comments.updateComment(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;
