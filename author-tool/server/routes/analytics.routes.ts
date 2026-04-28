import { Router } from 'express';
import * as ga4 from '../services/ga4.service.js';
import * as gsc from '../services/gsc.service.js';
import { getSeasonPresets, getDatePresets } from '../services/exam-season.service.js';
import {
  getAdTriggerState,
  checkAndUpdateAdTriggers,
  markAdsenseApproved,
} from '../services/ad-trigger.service.js';

const router = Router();

// GET /api/analytics/dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/dashboard', async (req, res, next) => {
  try {
    if (!ga4.isConfigured()) {
      return res.json({ success: true, data: null, message: 'GA4 not configured' });
    }
    const { start, end } = req.query as { start: string; end: string };
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'start and end query params required' });
    }
    const data = await ga4.getDashboard(start, end);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/analytics/overview?start=...&end=...
router.get('/overview', async (req, res, next) => {
  try {
    if (!ga4.isConfigured()) {
      return res.json({ success: true, data: null, message: 'GA4 not configured' });
    }
    const { start, end } = req.query as { start: string; end: string };
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'start and end query params required' });
    }
    const data = await ga4.getOverview(start, end);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/analytics/daily?start=...&end=...
router.get('/daily', async (req, res, next) => {
  try {
    if (!ga4.isConfigured()) {
      return res.json({ success: true, data: null, message: 'GA4 not configured' });
    }
    const { start, end } = req.query as { start: string; end: string };
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'start and end query params required' });
    }
    const data = await ga4.getDailyTrend(start, end);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/analytics/gsc-setup — return service account email + site url (for UI setup instructions)
router.get('/gsc-setup', (_req, res) => {
  res.json({
    success: true,
    data: {
      serviceAccountEmail: gsc.getServiceAccountEmail(),
      siteUrl: gsc.getSiteUrl(),
    },
  });
});

// GET /api/analytics/search-console?start=...&end=...
router.get('/search-console', async (req, res, next) => {
  try {
    if (!gsc.isConfigured()) {
      return res.json({ success: true, data: null, message: 'Search Console not configured' });
    }
    const { start, end } = req.query as { start: string; end: string };
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'start and end query params required' });
    }
    const data = await gsc.getSearchConsole(start, end);
    res.json({ success: true, data });
  } catch (err) {
    const msg = (err as Error).message || '';
    if (msg.includes('has not been used in project') || msg.includes('is disabled')) {
      return res.json({
        success: true,
        data: null,
        message: 'GSC_API_DISABLED',
        details: msg,
      });
    }
    if (msg.includes('403') || msg.includes('404') || msg.includes('permission')) {
      return res.json({
        success: true,
        data: null,
        message: 'GSC_NO_PERMISSION',
        details: msg,
      });
    }
    next(err);
  }
});

// POST /api/analytics/refresh
router.post('/refresh', (_req, res) => {
  ga4.clearCache();
  gsc.clearCache();
  res.json({ success: true, data: { cleared: true } });
});

// GET /api/analytics/presets
router.get('/presets', (_req, res) => {
  res.json({
    success: true,
    data: {
      dates: getDatePresets(),
      seasons: getSeasonPresets(),
    },
  });
});

// GET /api/analytics/ad-triggers
router.get('/ad-triggers', async (_req, res, next) => {
  try {
    const state = await getAdTriggerState();
    res.json({ success: true, data: state });
  } catch (err) { next(err); }
});

// POST /api/analytics/ad-triggers/check  (force re-check now)
router.post('/ad-triggers/check', async (_req, res, next) => {
  try {
    const state = await checkAndUpdateAdTriggers();
    res.json({ success: true, data: state });
  } catch (err) { next(err); }
});

// POST /api/analytics/ad-triggers/adsense  { approved: boolean }
router.post('/ad-triggers/adsense', async (req, res, next) => {
  try {
    const approved = Boolean((req.body as { approved?: boolean })?.approved);
    const state = await markAdsenseApproved(approved);
    res.json({ success: true, data: state });
  } catch (err) { next(err); }
});

export default router;
