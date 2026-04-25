import { Router } from 'express';
import * as ads from '../services/ad-campaign.service.js';

const router = Router();

function assertConfigured(res: import('express').Response): boolean {
  if (!ads.isConfigured()) {
    res.status(503).json({
      success: false,
      error: 'R2가 설정되지 않았습니다. R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY를 확인하세요.',
    });
    return false;
  }
  return true;
}

router.get('/', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const data = await ads.listCampaigns({
      projectId: req.query.projectId as string | undefined,
      platform: req.query.platform as ads.AdPlatform | undefined,
      status: req.query.status as ads.AdStatus | undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/summary', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const projectId = req.query.projectId as string;
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const data = await ads.summarize(projectId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const { projectId, platform, name, startDate } = req.body;
    if (!projectId || !platform || !name || !startDate) {
      return res.status(400).json({ success: false, error: 'projectId, platform, name, startDate required' });
    }
    const data = await ads.createCampaign(req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const data = await ads.updateCampaign(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    await ads.deleteCampaign(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
