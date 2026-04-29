import { Router } from 'express';
import { getActiveReminders, getUpcomingReminders } from '../services/reminder.service.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const active = getActiveReminders();
    const upcoming = getUpcomingReminders();
    res.json({ active, upcoming });
  } catch (err) {
    console.error('[reminder] fetch failed:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
