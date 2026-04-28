import { Router } from 'express';
import {
  suggestKeywordsExpanded,
  normalizeCompetition,
  isGoldenKeyword,
} from '../services/naver-keyword.service.js';
import { fetchGoogleKeywords, isConfigured } from '../services/dataforseo-keyword.service.js';

const router = Router();

// GET /api/google-tools/status — quick check whether DataForSEO is configured
router.get('/status', (_req, res) => {
  res.json({ success: true, data: { configured: isConfigured() } });
});

// POST /api/google-tools/research — seed → AI suggest → DataForSEO bulk volumes
// body: { seed: string, context?: string, limit?: number }
router.post('/research', async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'DataForSEO 자격증명이 설정되지 않았습니다. .env에 DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD를 추가하세요.',
      });
    }

    const { seed, context, limit } = req.body as { seed: string; context?: string; limit?: number };
    if (!seed?.trim()) {
      return res.status(400).json({ success: false, error: 'seed is required' });
    }

    const seedTrim = seed.trim();
    // Use the same expanded-seed strategy as Naver: longtails (intent) + adjacent (broader topics)
    const expanded = await suggestKeywordsExpanded(seedTrim, context);
    const longtailCap = Math.min(limit ?? 30, 50);
    const cappedLongtails = expanded.longtails.slice(0, longtailCap);
    const adjacent = expanded.adjacent;

    const allHints = [seedTrim, ...cappedLongtails, ...adjacent];
    const unique = [...new Set(allHints.map((k) => k.trim()).filter(Boolean))];

    // DataForSEO returns one row per submitted keyword (no auto-expansion noise),
    // so we don't need a relevance filter — every result is a candidate we asked for.
    const volumes = await fetchGoogleKeywords(unique);

    // Fill in missing keywords (DataForSEO sometimes drops zero-volume ones)
    const final = [
      ...volumes,
      ...unique
        .filter((t) => !volumes.some((v) => v.keyword.replace(/\s/g, '') === t.replace(/\s/g, '')))
        .map((t) => ({
          keyword: t,
          searchVolume: 0,
          competition: '낮음',
          competitionLevel: normalizeCompetition('낮음'),
          competitionIndex: null,
          cpc: 0,
          monthlyTrend: [],
          isGolden: isGoldenKeyword(0, 'low'),
        })),
    ];

    res.json({
      success: true,
      data: {
        suggestions: unique,
        adjacent,
        keywords: final,
      },
    });
  } catch (err) { next(err); }
});

// POST /api/google-tools/keyword-data — bulk volume lookup for given keywords
// body: { keywords: string[] }
router.post('/keyword-data', async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(400).json({ success: false, error: 'DataForSEO not configured' });
    }
    const { keywords } = req.body as { keywords: string[] };
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ success: false, error: 'keywords array is required' });
    }
    const data = await fetchGoogleKeywords(keywords);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
