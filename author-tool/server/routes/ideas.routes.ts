import { Router } from 'express';
import { generateIdeas } from '../services/idea-generator.service.js';

const router = Router();

// POST /api/ideas/generate
// body: { projectId, keywords: string[], count?, channel?, instruction? }
router.post('/generate', async (req, res, next) => {
  try {
    const { projectId, keywords, count, channel, instruction } = req.body as {
      projectId: string;
      keywords: string[];
      count?: number;
      channel?: 'blog' | 'instagram' | 'threads' | 'longform' | 'shortform';
      instruction?: string;
    };
    if (!projectId) return res.status(400).json({ success: false, error: 'projectId required' });
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ success: false, error: 'keywords array required' });
    }
    const ideas = await generateIdeas({ projectId, keywords, count, channel, instruction });
    res.json({ success: true, data: ideas });
  } catch (err) { next(err); }
});

export default router;
