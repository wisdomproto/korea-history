import { schedule, validate, ScheduledTask } from 'node-cron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { generateAndStoreWeeklyReport } from './weekly-report.service.js';
import { isSupabaseConfigured } from './supabase.service.js';
import { isConfigured as isGa4Configured } from './ga4.service.js';
import { processDueJobs } from './publisher.service.js';
import { checkAndUpdateAdTriggers } from './ad-trigger.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let task: ScheduledTask | null = null;
let publishTask: ScheduledTask | null = null;
let seoMonthlyTask: ScheduledTask | null = null;

export function startCron(): void {
  startWeeklyReportCron();
  startPublishQueueCron();
  startSeoMonthlyCron();
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

function startSeoMonthlyCron(): void {
  // Run on the 1st of each month at 09:00 KST. Output goes to Railway logs + ephemeral _research/.
  // For persistent file output, run locally: `cd author-tool && npm run seo:monthly`
  if (!isGa4Configured()) {
    console.log('[cron] SEO monthly skipped — GA4/GSC not configured');
    return;
  }
  if (seoMonthlyTask) return;

  const cronExpr = '0 9 1 * *';
  if (!validate(cronExpr)) {
    console.error(`[cron] invalid SEO monthly expression: ${cronExpr}`);
    return;
  }

  seoMonthlyTask = schedule(
    cronExpr,
    () => {
      const started = Date.now();
      const scriptPath = path.resolve(__dirname, '../../scripts/seo-monthly-update.mjs');
      console.log(`[cron] SEO monthly start @ ${new Date().toISOString()} → ${scriptPath}`);
      const proc = spawn('node', [scriptPath], { cwd: path.resolve(__dirname, '../..') });
      proc.stdout.on('data', (d) => process.stdout.write(`[seo-monthly] ${d}`));
      proc.stderr.on('data', (d) => process.stderr.write(`[seo-monthly] ${d}`));
      proc.on('close', (code) => {
        console.log(`[cron] SEO monthly done — exit=${code} (${Date.now() - started}ms)`);
      });
    },
    { timezone: 'Asia/Seoul' }
  );
  console.log(`[cron] SEO monthly scheduled: "${cronExpr}" (Asia/Seoul)`);
}

export function stopCron(): void {
  task?.stop();
  task = null;
  publishTask?.stop();
  publishTask = null;
  seoMonthlyTask?.stop();
  seoMonthlyTask = null;
}
