/**
 * Manually generate the most recently completed week's report, or a specific
 * week passed as `START END` arguments (YYYY-MM-DD).
 *
 *   npx tsx scripts/weekly-report-backfill.ts
 *   npx tsx scripts/weekly-report-backfill.ts 2026-04-14 2026-04-20
 */
import {
  generateAndStoreWeeklyReport,
  getLastCompletedWeek,
} from '../server/services/weekly-report.service.js';

(async () => {
  const [, , startArg, endArg] = process.argv;
  let weekStart = startArg;
  let weekEnd = endArg;
  if (!weekStart || !weekEnd) {
    const w = getLastCompletedWeek();
    weekStart = w.weekStart;
    weekEnd = w.weekEnd;
    console.log(`No args — using last completed week: ${weekStart} ~ ${weekEnd}`);
  } else {
    console.log(`Using provided week: ${weekStart} ~ ${weekEnd}`);
  }

  console.log('Generating weekly report…');
  const row = await generateAndStoreWeeklyReport(weekStart, weekEnd);
  console.log('\n✓ Stored successfully');
  console.log(`  id: ${row.id}`);
  console.log(`  week: ${row.week_start} ~ ${row.week_end}`);
  console.log(`  created_at: ${row.created_at}`);
  console.log(`\nHighlights:`);
  for (const h of row.highlights || []) {
    console.log(`  · ${h.label}: ${h.value}${h.delta ? ` (${h.delta})` : ''}`);
  }
  console.log(`\nAI summary preview:`);
  console.log((row.ai_summary || '').slice(0, 400) + '…');
})().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
