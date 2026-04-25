import { Router } from 'express';
import * as instagram from '../services/instagram.service.js';
import * as youtube from '../services/youtube-analytics.service.js';

const router = Router();

// GET /api/channel-analytics/instagram?projectId=...
router.get('/instagram', async (_req, res, next) => {
  try {
    if (!instagram.isConfigured()) {
      return res.json({
        success: true,
        data: null,
        message: 'Instagram 미설정 — INSTAGRAM_USER_ID + INSTAGRAM_ACCESS_TOKEN 환경변수가 필요합니다.',
      });
    }
    const [snapshot, insights, media] = await Promise.all([
      instagram.getAccountSnapshot(),
      instagram.getAccountInsights(14),
      instagram.listMediaWithInsights(12),
    ]);
    res.json({
      success: true,
      data: {
        account: snapshot,
        insights,
        media,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/channel-analytics/youtube?projectId=...
router.get('/youtube', async (req, res, next) => {
  try {
    if (!youtube.isConfigured()) {
      return res.json({
        success: true,
        data: null,
        message: 'YouTube Data API 미설정 — YOUTUBE_API_KEY 환경변수가 필요합니다.',
      });
    }
    const projectId = req.query.projectId as string;
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const data = await youtube.getProjectYoutubeSnapshot(projectId);
    if (!data) {
      return res.json({
        success: true,
        data: null,
        message: '프로젝트에 YouTube 채널이 연결되어 있지 않습니다. 프로젝트 설정 → API·연동 탭에서 채널 ID 또는 핸들을 입력하세요.',
      });
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
