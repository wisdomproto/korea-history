/**
 * Date-based reminder system for content/SEO milestones.
 *
 * Centrally configured reminders trigger between fromDate and toDate.
 * Frontend polls /api/reminders periodically (or on view mount) to show
 * any active reminders.
 *
 * To add a new reminder: append to REMINDERS array.
 * Past reminders auto-disappear (toDate + 1day).
 */

export type ReminderSeverity = 'info' | 'warning' | 'urgent';

export interface ReminderDef {
  id: string;
  /** ISO date YYYY-MM-DD (KST 기준) — 알람 노출 시작일 */
  fromDate: string;
  /** ISO date YYYY-MM-DD — 알람 노출 종료일 (포함) */
  toDate: string;
  severity: ReminderSeverity;
  icon: string;
  title: string;
  description: string;
  /** Optional CTA — 사이드바 위치 또는 외부 URL */
  cta?: { label: string; href: string };
}

export interface ReminderActive extends ReminderDef {
  /** 오늘이 노출 기간 내 며칠째인지 */
  dayOfWindow: number;
  /** 노출 종료까지 남은 일수 */
  daysRemaining: number;
}

const REMINDERS: ReminderDef[] = [
  // ─── 블로그 1차 batch 마무리 시점 ───
  {
    id: 'blog-batch-1-midpoint',
    fromDate: '2026-05-25',
    toDate: '2026-06-05',
    severity: 'info',
    icon: '📝',
    title: '한능검 블로그 1차 batch 마무리 시점',
    description:
      '4/29부터 발행 시작한 22편 중 절반 이상이 라이브됐습니다. 이쯤에서 GSC 데이터를 확인하고, 다음 batch (공무원/자격증) 작성 계획을 세워보세요.',
    cta: { label: '블로그 보기', href: '/docs/seo-strategy.html' },
  },

  // ─── 블로그 1차 batch 완전 종료 + GSC 측정 시점 ───
  {
    id: 'blog-batch-1-complete',
    fromDate: '2026-06-17',
    toDate: '2026-06-30',
    severity: 'warning',
    icon: '📊',
    title: '블로그 1차 batch 발행 완료 → GSC 측정 시점',
    description:
      '22편이 모두 라이브된 시점입니다. 첫 글(병자호란) 발행 후 약 7주가 지나 GSC에 노출 데이터가 보이기 시작할 시기예요. SEO 전략 문서 § 09 KPI를 갱신하고, 어떤 글이 가장 잘 먹히는지 확인하세요.',
    cta: { label: 'GSC 보기', href: 'https://search.google.com/search-console' },
  },

  // ─── 1차 batch 발행 후 8주, 본격 효과 측정 ───
  {
    id: 'blog-8week-review',
    fromDate: '2026-07-25',
    toDate: '2026-08-10',
    severity: 'info',
    icon: '🎯',
    title: '블로그 발행 후 8주 — 본격 SEO 효과 측정',
    description:
      '병자호란 발행 후 8주가 됐습니다. Google이 글들을 본격적으로 평가하기 시작하는 시점이에요. 황금키워드 26개의 노출/순위/클릭을 GSC에서 확인하고, 효과 좋은 글 패턴을 파악해 다음 batch에 반영하세요.',
  },

  // ─── 12주 차, 1페이지 진입 측정 ───
  {
    id: 'blog-12week-review',
    fromDate: '2026-08-22',
    toDate: '2026-09-10',
    severity: 'info',
    icon: '🚀',
    title: '블로그 발행 후 12주 — 1페이지 진입 측정',
    description:
      '낮은 경쟁도 황금키워드(노비안검법·균역법·환국 등)가 1페이지 진입할 가능성이 높은 시점입니다. GSC에서 평균 순위 1~10위 키워드를 확인하고, 진입한 글은 본문 보강 또는 백링크 빌딩으로 더 끌어올려 보세요.',
  },

  // ─── 공무원/자격증 batch 작성 시점 ───
  {
    id: 'phase3-civil-cert-blogs',
    fromDate: '2026-06-15',
    toDate: '2026-06-30',
    severity: 'info',
    icon: '⚖️',
    title: 'Phase 3 — 공무원/자격증 블로그 batch 작성 시점',
    description:
      '한능검 1차 batch 마무리에 맞춰 공무원·자격증 영역 블로그도 같은 패턴으로 batch 작성을 시작할 시점입니다. 9급 공무원 13개 과목 + 인기 자격증 9개부터.',
    cta: { label: 'SEO 전략 보기', href: '/docs/seo-strategy.html' },
  },

  // ─── 매월 1일 SEO 자동 갱신 결과 검토 ───
  {
    id: 'monthly-seo-review-may',
    fromDate: '2026-05-01',
    toDate: '2026-05-05',
    severity: 'info',
    icon: '📈',
    title: '5월 SEO 월간 갱신 — digest.md 검토',
    description:
      'Railway cron이 매월 1일 09:00 KST에 GSC + 네이버 키워드 데이터를 자동 갱신합니다. _research/seo-monthly/2026-05/digest.md를 읽고 SEO 전략 문서 § 01 KPI를 갱신하세요. (15분 작업)',
  },
];

/**
 * Returns reminders active for given date (default: today KST).
 */
export function getActiveReminders(today?: string): ReminderActive[] {
  const now = today ?? todayKst();
  return REMINDERS
    .filter((r) => r.fromDate <= now && now <= r.toDate)
    .map((r) => ({
      ...r,
      dayOfWindow: daysBetween(r.fromDate, now) + 1,
      daysRemaining: daysBetween(now, r.toDate),
    }))
    .sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity));
}

/**
 * All future reminders (for previewing upcoming alerts).
 */
export function getUpcomingReminders(today?: string, limitDays: number = 30): ReminderDef[] {
  const now = today ?? todayKst();
  const limit = addDays(now, limitDays);
  return REMINDERS
    .filter((r) => r.fromDate > now && r.fromDate <= limit)
    .sort((a, b) => a.fromDate.localeCompare(b.fromDate));
}

function todayKst(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function severityOrder(s: ReminderSeverity): number {
  return { urgent: 3, warning: 2, info: 1 }[s];
}
