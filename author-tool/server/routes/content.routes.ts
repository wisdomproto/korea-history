// author-tool/server/routes/content.routes.ts
import { Router } from 'express';
import * as contentService from '../services/content.service.js';
import * as generator from '../services/content-generator.service.js';
import { generateImage } from '../services/gemini.provider.js';
import { putObject, getPublicUrl } from '../services/r2.service.js';

const router = Router();

// ─── CRUD ───
router.get('/', async (_req, res, next) => {
  try {
    const index = await contentService.readIndex();
    res.json({ success: true, data: index });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, sourceType, sourceId } = req.body;
    const file = await contentService.createContent(title, sourceType, sourceId);
    res.json({ success: true, data: file });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const file = await contentService.readContentFile(req.params.id);
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: file });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const file = await contentService.updateContentMeta(req.params.id, req.body);
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: file });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await contentService.deleteContent(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Base Article ───
router.put('/:id/base-article', async (req, res, next) => {
  try {
    const file = await contentService.saveBaseArticle(req.params.id, req.body);
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: file });
  } catch (err) { next(err); }
});

router.post('/:id/base-article/generate', async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await generator.generateBaseArticle(req.params.id, req.body.modelId, req.body.extraPrompt, res);
    res.end();
  } catch (err) { next(err); }
});

// ─── Channel Generation (SSE) ───
router.post('/:id/generate/:channel', async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await generator.generateChannelContent(
      {
        contentId: req.params.id,
        channel: req.params.channel,
        modelId: req.body.modelId,
        targetDuration: req.body.targetDuration,
      },
      res,
    );
    res.end();
  } catch (err) { next(err); }
});

// ─── Channel Content Save/Delete ───
router.put('/:id/channels/:channel/:channelContentId', async (req, res, next) => {
  try {
    const file = await contentService.saveChannelContent(
      req.params.id, req.params.channel, req.params.channelContentId, req.body,
    );
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: file });
  } catch (err) { next(err); }
});

router.delete('/:id/channels/:channel/:channelContentId', async (req, res, next) => {
  try {
    const file = await contentService.deleteChannelContent(
      req.params.id, req.params.channel, req.params.channelContentId,
    );
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: file });
  } catch (err) { next(err); }
});

// ─── Image Generation ───
router.post('/:id/channels/:channel/image', async (req, res, next) => {
  try {
    const { targetId, imagePrompt, modelId } = req.body;
    if (!targetId || !imagePrompt) {
      return res.status(400).json({ success: false, error: 'targetId and imagePrompt required' });
    }

    const imageBuffer = await generateImage(imagePrompt, modelId);
    const r2Key = `contents/${req.params.id}/${req.params.channel}/${targetId}.png`;
    await putObject(r2Key, imageBuffer, 'image/png');
    const imageUrl = getPublicUrl(r2Key);

    res.json({ success: true, data: { imageUrl } });
  } catch (err) { next(err); }
});

export default router;
