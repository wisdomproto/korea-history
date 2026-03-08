import { ImageService } from '../services/image.service.js';
import { TEXT_MODELS, IMAGE_MODELS } from '../services/gemini.provider.js';
import { asyncHandler } from '../middleware.js';

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
};
