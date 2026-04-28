import { schedule, validate, ScheduledTask } from 'node-cron';
import { config } from '../config.js';
import { generateAndStoreWeeklyReport } from './weekly-report.service.js';
import { isSupabaseConfigured } from './supabase.service.js';
import { isConfigured as isGa4Configured } from './ga4.service.js';
import { processDueJobs } from './publisher.service.js';
import { checkAndUpdateAdTriggers } from './ad-trigger.service.js';

let task: ScheduledTask | null = null;
let publishTask: ScheduledTask | null = null;

export function startCron(): void {
  startWeeklyReportCron();
  startPublishQueueCron();
}

function startWeeklyReportCron(): void {
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
      try {
        const state = await checkAndUpdateAdTriggers();
        const fired = [
          state.daily500.triggered ? 'daily500' : null,
          state.fourWeeks.triggered ? 'fourWeeks' : null,
          state.adsenseApproved.triggered ? 'adsense' : null,
        ].filter(Boolean);
        console.log(`[cron] ad triggers — fired: [${fired.join(', ') || 'none'}] dau=${state.daily500.latestDau}`);
      } catch (err) {
        console.error('[cron] ad trigger check failed:', (err as Error).message);
      }
    },
    { timezone: cronTimezone }
  );
  console.log(`[cron] weekly report scheduled: "${cronExpr}" (${cronTimezone})`);
}

function startPublishQueueCron(): void {
  // Publish queue lives on R2 JSON now (not Supabase). Check R2 config instead.
  const hasR2 = !!(config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey);
  if (!hasR2) {
    console.log('[cron] publish queue skipped — R2 not configured');
    return;
  }
  if (publishTask) return;

  // Every minute: pick up scheduled jobs that are due and publish them.
  publishTask = schedule('*/1 * * * *', async () => {
    try {
      const res = await processDueJobs();
      if (res.picked > 0) {
        console.log(`[cron] publish queue — picked=${res.picked} ok=${res.ok} failed=${res.failed}`);
      }
    } catch (err) {
      console.error('[cron] publish queue error:', (err as Error).message);
    }
  });
  console.log('[cron] publish queue scheduled: every minute (R2-backed)');
}

export function stopCron(): void {
  task?.stop();
  task = null;
  publishTask?.stop();
  publishTask = null;
}
