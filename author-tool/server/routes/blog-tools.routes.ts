import { Router } from 'express';
import { suggestKeywords, fetchNaverKeywords } from '../services/naver-keyword.service.js';
import { calculateSeoScore } from '../services/seo-scorer.js';
import * as gsc from '../services/gsc.service.js';

const router = Router();

// POST /api/blog-tools/research — seed → AI suggest → Naver enrichment in one shot
// body: { seed: string, context?: string, limit?: number }
router.post('/research', async (req, res, next) => {
  try {
    const { seed, context, limit } = req.body as { seed: string; context?: string; limit?: number };
    if (!seed?.trim()) {
      return res.status(400).json({ success: false, error: 'seed is required' });
    }
    const rawSuggestions = await suggestKeywords(seed.trim(), context);
    const cap = Math.min(limit ?? 15, 20);
    const suggestions = [seed.trim(), ...rawSuggestions].slice(0, cap);
    const unique = [...new Set(suggestions.map((k) => k.trim()).filter(Boolean))];
    const volumes = await fetchNaverKeywords(unique);
    // Merge: keep AI-suggested terms that got Naver data; plus any related terms returned by Naver.
    const merged = [
      ...volumes,
      ...unique
        .filter((t) => !volumes.some((v) => v.keyword.replace(/\s/g, '') === t.replace(/\s/g, '')))
        .map((t) => ({
          keyword: t,
          pcSearchVolume: 0,
          mobileSearchVolume: 0,
          totalSearchVolume: 0,
          competition: 'LOW',
          pcCtr: 0,
          mobileCtr: 0,
        })),
    ];
    res.json({ success: true, data: { suggestions: unique, keywords: merged } });
  } catch (err) { next(err); }
});

// POST /api/blog-tools/gsc-opportunities — pull top queries with low CTR (content opportunity)
// body: { start: string, end: string, minImpressions?: number, maxPosition?: number }
router.post('/gsc-opportunities', async (req, res, next) => {
  try {
    if (!gsc.isConfigured()) {
      return res.json({ success: true, data: null, message: 'GSC not configured' });
    }
    const { start, end, minImpressions, maxPosition } = req.body as {
      start: string; end: string; minImpressions?: number; maxPosition?: number;
    };
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'start and end are required' });
    }
    const data = await gsc.getSearchConsole(start, end);
    const minImp = minImpressions ?? 10;
    const maxPos = maxPosition ?? 30;
    const opportunities = data.queries
      .filter((q) => q.impressions >= minImp && q.position <= maxPos)
      .sort((a, b) => b.impressions - a.impressions);
    res.json({ success: true, data: { queries: opportunities, totals: data.totals } });
  } catch (err) {
    const msg = (err as Error).message || '';
    if (msg.includes('has not been used') || msg.includes('403') || msg.includes('404')) {
      return res.json({ success: true, data: null, message: 'GSC_NOT_ACCESSIBLE', details: msg });
    }
    next(err);
  }
});

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
