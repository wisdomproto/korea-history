import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware.js';
import { isConfigured, publishToInstagram, uploadBuffersToR2 } from '../services/instagram.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 10 },
});

router.get('/status', (_req, res) => {
  res.json({ success: true, data: { configured: isConfigured() } });
});

router.post(
  '/publish',
  upload.array('images', 10),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const caption = typeof req.body.caption === 'string' ? req.body.caption : '';
    const contentId = typeof req.body.contentId === 'string' && req.body.contentId ? req.body.contentId : 'adhoc';

    if (files.length === 0) {
      res.status(400).json({ success: false, error: '이미지가 전송되지 않았습니다.' });
      return;
    }

    const urls = await uploadBuffersToR2(files.map((f) => f.buffer), contentId);
    const published = await publishToInstagram(urls, caption);
    res.json({ success: true, data: { ...published, imageUrls: urls } });
  }),
);

export default router;
