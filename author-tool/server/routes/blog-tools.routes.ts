import { Router } from 'express';
import { suggestKeywords, suggestKeywordsExpanded, fetchNaverKeywords, normalizeCompetition, isGoldenKeyword } from '../services/naver-keyword.service.js';
import { calculateSeoScore } from '../services/seo-scorer.js';
import * as gsc from '../services/gsc.service.js';
import { analyzeGoldenKeywords } from '../services/golden-keyword.service.js';
import { getBatchBidEstimates } from '../services/naver-bid.service.js';

const router = Router();

// POST /api/blog-tools/research — seed → AI suggest → Naver enrichment in one shot
// body: { seed: string, context?: string, limit?: number }
router.post('/research', async (req, res, next) => {
  try {
    const { seed, context, limit } = req.body as { seed: string; context?: string; limit?: number };
    if (!seed?.trim()) {
      return res.status(400).json({ success: false, error: 'seed is required' });
    }
    const seedTrim = seed.trim();
    const seedKey = seedTrim.replace(/\s+/g, '');

    // Expand seed into longtails + adjacent broader topics
    const expanded = await suggestKeywordsExpanded(seedTrim, context);
    const longtails = expanded.longtails;
    const adjacent = expanded.adjacent;

    // Cap longtails to keep prompt + Naver batches reasonable
    const longtailCap = Math.min(limit ?? 30, 50);
    const cappedLongtails = longtails.slice(0, longtailCap);

    // All hints to send to Naver
    const allHints = [seedTrim, ...cappedLongtails, ...adjacent];
    const unique = [...new Set(allHints.map((k) => k.trim()).filter(Boolean))];

    const volumes = await fetchNaverKeywords(unique);

    // Build relevance filter:
    //  - Keep if keyword contains the seed
    //  - Keep if keyword contains any adjacent topic (≥3 chars to avoid noise)
    //  - Keep if keyword exactly matches one of our AI longtails
    const adjTokens = adjacent
      .map((a) => a.replace(/\s+/g, ''))
      .filter((a) => a.length >= 3);

    const isRelevant = (keyword: string) => {
      const k = keyword.replace(/\s+/g, '');
      if (k.includes(seedKey)) return true;
      if (adjTokens.some((t) => k.includes(t))) return true;
      return unique.some((u) => k === u.replace(/\s+/g, ''));
    };

    const filteredVolumes = volumes.filter((v) => isRelevant(v.keyword));

    // Merge: keep AI-suggested terms that got Naver data; fill missing with zero-vol entries.
    const merged = [
      ...filteredVolumes,
      ...unique
        .filter((t) => !filteredVolumes.some((v) => v.keyword.replace(/\s/g, '') === t.replace(/\s/g, '')))
        .map((t) => ({
          keyword: t,
          pcSearchVolume: 0,
          mobileSearchVolume: 0,
          totalSearchVolume: 0,
          competition: '낮음',
          competitionLevel: normalizeCompetition('낮음'),
          pcCtr: 0,
          mobileCtr: 0,
          isGolden: isGoldenKeyword(0, 'low'),
        })),
    ];
    res.json({
      success: true,
      data: {
        suggestions: unique,
        adjacent,
        keywords: merged,
      },
    });
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

// POST /api/blog-tools/naver-bid — batch CPC estimates from Naver Search Ad API
// body: { keywords: string[], device?: 'PC'|'MOBILE'|'BOTH', bids?: number[] }
router.post('/naver-bid', async (req, res, next) => {
  try {
    const { keywords, device, bids } = req.body as {
      keywords: string[];
      device?: 'PC' | 'MOBILE' | 'BOTH';
      bids?: number[];
    };
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ success: false, error: 'keywords array required' });
    }
    const data = await getBatchBidEstimates(keywords, { device, bids });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /api/blog-tools/golden-keywords — Gemini-powered golden keyword + insights analysis
// body: { source: 'naver'|'google', projectId?: string, keywords: [{ keyword, totalVolume, competition }], instruction? }
router.post('/golden-keywords', async (req, res, next) => {
  try {
    const { source, projectId, keywords, instruction } = req.body as {
      source: 'naver' | 'google';
      projectId?: string;
      keywords: Array<{ keyword: string; totalVolume: number; competition: string }>;
      instruction?: string;
    };
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ success: false, error: 'keywords array required' });
    }
    const result = await analyzeGoldenKeywords({ source, projectId, keywords, instruction });
    res.json({ success: true, data: result });
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
