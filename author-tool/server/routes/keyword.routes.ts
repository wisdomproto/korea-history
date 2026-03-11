import { Router } from 'express';
import { KeywordService } from '../services/keyword.service.js';
import { asyncHandler } from '../middleware.js';
import type { Request, Response } from 'express';

const router = Router();

/** GET /api/keywords — 현재 키워드 데이터 */
router.get('/', asyncHandler(async (_req, res) => {
  const data = await KeywordService.get();
  res.json({ success: true, data });
}));

/** GET /api/keywords/stats — 시대별/분야별 키워드 통계 */
router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = await KeywordService.getStats();
  res.json({ success: true, data: stats });
}));

/** POST /api/keywords/extract — 키워드 추출 (SSE 진행상황) */
router.post('/extract', async (req: Request, res: Response) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (type: string, data: unknown) => {
    const payload = typeof data === 'string' ? { message: data } : (data as Record<string, unknown>);
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  try {
    const kwData = await KeywordService.extract((msg) => send('progress', msg));
    send('done', { totalKeywords: Object.keys(kwData.keywords).length });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    send('error', { error: message });
  } finally {
    res.end();
  }
});

export default router;
