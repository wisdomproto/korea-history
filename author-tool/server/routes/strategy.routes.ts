import { Router } from 'express';
import * as ai from '../services/strategy-ai.service.js';

const router = Router();

router.post('/draft/icp', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const data = await ai.draftIcp(projectId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/draft/jtbds', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const data = await ai.draftJtbds(projectId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/draft/funnel', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const data = await ai.draftFunnel(projectId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/draft/channel-mix', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const data = await ai.draftChannelMix(projectId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/draft/okrs', async (req, res, next) => {
  try {
    const { projectId, quarter } = req.body;
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const q = quarter ?? defaultQuarter();
    const data = await ai.draftOkrs(projectId, q);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/draft/season-calendar', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const data = await ai.draftSeasonCalendar(projectId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

function defaultQuarter(): string {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

export default router;
