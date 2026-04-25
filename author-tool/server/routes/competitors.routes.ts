import { Router } from 'express';
import * as competitor from '../services/competitor.service.js';
import * as sync from '../services/competitor-sync.service.js';
import * as ai from '../services/competitor-ai.service.js';

const router = Router();

function assertConfigured(res: import('express').Response): boolean {
  if (!competitor.isConfigured()) {
    res.status(503).json({
      success: false,
      error: 'R2가 설정되지 않았습니다.',
    });
    return false;
  }
  return true;
}

router.get('/', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const data = await competitor.listCompetitors(req.query.projectId as string | undefined);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const data = await competitor.getCompetitor(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const { projectId, name, notes, tags, channels } = req.body;
    if (!projectId || !name?.trim()) {
      return res.status(400).json({ success: false, error: 'projectId, name required' });
    }
    const data = await competitor.createCompetitor({ projectId, name: name.trim(), notes, tags, channels });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const data = await competitor.updateCompetitor(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    await competitor.deleteCompetitor(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/:id/channels', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const { type, url, identifier } = req.body;
    if (!type || !url) return res.status(400).json({ success: false, error: 'type, url required' });
    const data = await competitor.addChannel(req.params.id, { type, url, identifier });
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:id/channels/:channelId', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const data = await competitor.removeChannel(req.params.id, req.params.channelId);
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/:id/sync', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const result = await sync.syncCompetitor(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/:id/extract-topics', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const data = await ai.extractTopics(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/gap-analysis', async (req, res, next) => {
  try {
    if (!assertConfigured(res)) return;
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    const data = await ai.analyzeGap(projectId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
