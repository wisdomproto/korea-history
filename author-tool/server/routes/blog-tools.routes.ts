import { Router } from 'express';
import { suggestKeywords, fetchNaverKeywords } from '../services/naver-keyword.service.js';
import { calculateSeoScore } from '../services/seo-scorer.js';

const router = Router();

// POST /api/blog-tools/suggest-keywords
router.post('/suggest-keywords', async (req, res, next) => {
  try {
    const { topic, baseArticle } = req.body as { topic: string; baseArticle?: string };
    if (!topic) {
      return res.status(400).json({ success: false, error: 'topic is required' });
    }
    const keywords = await suggestKeywords(topic, baseArticle);
    res.json({ success: true, data: keywords });
  } catch (err) { next(err); }
});

// POST /api/blog-tools/keyword-data
router.post('/keyword-data', async (req, res, next) => {
  try {
    const { keywords } = req.body as { keywords: string[] };
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ success: false, error: 'keywords array is required' });
    }
    const data = await fetchNaverKeywords(keywords);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /api/blog-tools/seo-score
router.post('/seo-score', async (req, res, next) => {
  try {
    const { title, cards, primaryKeyword, secondaryKeywords } = req.body;
    if (!title && !cards) {
      return res.status(400).json({ success: false, error: 'title and cards are required' });
    }
    const result = calculateSeoScore({
      title: title ?? '',
      cards: cards ?? [],
      primaryKeyword: primaryKeyword ?? '',
      secondaryKeywords: secondaryKeywords ?? [],
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default router;
