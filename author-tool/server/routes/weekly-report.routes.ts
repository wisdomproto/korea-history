import { Router } from 'express';
import {
  listWeeklyReports,
  getWeeklyReport,
  generateAndStoreWeeklyReport,
  deleteWeeklyReport,
  getLastCompletedWeek,
} from '../services/weekly-report.service.js';
import { isSupabaseConfigured } from '../services/supabase.service.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({
        success: true,
        data: { configured: false, reports: [] },
      });
    }
    const reports = await listWeeklyReports();
    res.json({ success: true, data: { configured: true, reports } });
  } catch (err) {
    next(err);
  }
});

router.get('/latest', async (_req, res, next) => {
  try {
    if (!isSupabaseConfigured()) return res.json({ success: true, data: null });
    const [row] = await listWeeklyReports(1);
    res.json({ success: true, data: row || null });
  } catch (err) {
    next(err);
  }
});

router.get('/:weekStart', async (req, res, next) => {
  try {
    const { weekStart } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return res.status(400).json({ success: false, error: 'invalid week_start' });
    }
    const row = await getWeeklyReport(weekStart);
    if (!row) return res.status(404).json({ success: false, error: 'not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const { weekStart, weekEnd } = (req.body || {}) as {
      weekStart?: string;
      weekEnd?: string;
    };
    const row = await generateAndStoreWeeklyReport(weekStart, weekEnd);
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/:weekStart', async (req, res, next) => {
  try {
    await deleteWeeklyReport(req.params.weekStart);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/meta/next-target', (_req, res) => {
  res.json({ success: true, data: getLastCompletedWeek() });
});

export default router;
