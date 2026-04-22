import { schedule, validate, ScheduledTask } from 'node-cron';
import { config } from '../config.js';
import { generateAndStoreWeeklyReport } from './weekly-report.service.js';
import { isSupabaseConfigured } from './supabase.service.js';
import { isConfigured as isGa4Configured } from './ga4.service.js';

let task: ScheduledTask | null = null;

export function startCron(): void {
  if (!config.weeklyReport.enabled) {
    console.log('[cron] weekly report disabled (WEEKLY_REPORT_ENABLED=false)');
    return;
  }
  if (!isSupabaseConfigured()) {
    console.log('[cron] weekly report skipped — Supabase not configured');
    return;
  }
  if (!isGa4Configured()) {
    console.log('[cron] weekly report skipped — GA4 not configured');
    return;
  }
  if (task) return;

  const { cronExpr, cronTimezone } = config.weeklyReport;
  if (!validate(cronExpr)) {
    console.error(`[cron] invalid expression: ${cronExpr}`);
    return;
  }

  task = schedule(
    cronExpr,
    async () => {
      const started = Date.now();
      console.log(`[cron] weekly report start @ ${new Date().toISOString()}`);
      try {
        const row = await generateAndStoreWeeklyReport();
        console.log(
          `[cron] weekly report ok — ${row.week_start} ~ ${row.week_end} (${Date.now() - started}ms)`
        );
      } catch (err) {
        console.error('[cron] weekly report failed:', (err as Error).message);
      }
    },
    { timezone: cronTimezone }
  );
  console.log(`[cron] weekly report scheduled: "${cronExpr}" (${cronTimezone})`);
}

export function stopCron(): void {
  task?.stop();
  task = null;
}
