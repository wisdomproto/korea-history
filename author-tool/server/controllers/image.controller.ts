import { ImageService } from '../services/image.service.js';
import { TEXT_MODELS, IMAGE_MODELS } from '../services/gemini.provider.js';
import { asyncHandler } from '../middleware.js';

// Allowed R2 host for proxy (prevent SSRF)
const ALLOWED_HOST = 'r2.dev';

export const ImageController = {
  upload: asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: '파일이 없습니다.' });
      return;
    }
    const url = await ImageService.save(file.buffer, file.originalname);
    res.json({ success: true, data: { url } });
  }),

  generate: asyncHandler(async (req, res) => {
    const { prompt, model } = req.body;
    const url = await ImageService.generate(prompt, model);
    res.json({ success: true, data: { url } });
  }),

  models: asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      data: { textModels: TEXT_MODELS, imageModels: IMAGE_MODELS },
    });
  }),

  delete: asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ success: false, error: 'url is required' });
      return;
    }
    await ImageService.delete(url);
    res.json({ success: true });
  }),

  /** Proxy R2 images to avoid CORS issues (for canvas crop) */
  proxy: asyncHandler(async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ success: false, error: 'url parameter required' });
      return;
    }
    // Only allow R2 URLs to prevent SSRF
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith(ALLOWED_HOST)) {
      res.status(403).json({ success: false, error: 'Forbidden host' });
      return;
    }
    const response = await fetch(url);
    if (!response.ok) {
      res.status(response.status).json({ success: false, error: 'Upstream error' });
      return;
    }
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  }),
};
