import { GeneratorService } from '../services/generator.service.js';
import { asyncHandler } from '../middleware.js';

export const GeneratorController = {
  generate: asyncHandler(async (req, res) => {
    const questions = await GeneratorService.generate(req.body);
    res.json({ success: true, data: questions });
  }),

  generateExplanation: asyncHandler(async (req, res) => {
    const explanation = await GeneratorService.generateExplanation(req.body);
    res.json({ success: true, data: explanation });
  }),
};
