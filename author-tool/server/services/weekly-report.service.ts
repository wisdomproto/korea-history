import * as ga4 from './ga4.service.js';
import { getSupabase, isSupabaseConfigured } from './supabase.service.js';
import { generateText } from './gemini.provider.js';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Types ───

export interface WeeklyHighlight {
  label: string;
  value: string;
  delta?: string;
  tone?: 'up' | 'down' | 'flat';
}

export interface WeeklySnapshot {
  weekStart: string;
  weekEnd: string;
  overview: {
    sessions: number;
    users: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
    engagementRate: number;
    newUsers: number;
  };
  changes: {
    sessions: number;
    users: number;
    pageViews: number;
    avgSessionDuration: number;
  };
  daily: Array<{ date: string; users: number; pageViews: number; sessions: number }>;
  channels: Array<{ channel: string; sessions: number; users: number; percentage: number }>;
  devices: Array<{ device: string; sessions: number; percentage: number }>;
  topPages: Array<{ path: string; pageViews: number; users: number; engagementPerView: number }>;
  pageGroups: Record<string, { pv: number; sessions: number; engPerPV: number }>;
  landingPages: Array<{ path: string; sessions: number; bounceRate: number; engagementRate: number }>;
  videoEvents: Array<{ name: string; count: number }>;
  examFunnel: Array<{ page: string; users: number; pv: number }>;
}

export interface WeeklyReportRow {
  id: string;
  week_start: string;
  week_end: string;
  data: WeeklySnapshot;
  ai_summary: string | null;
  highlights: WeeklyHighlight[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ─── Week helpers ───

/** Returns the Monday of the week containing `date` in local (KST-interpreted) terms. */
function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun .. 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Returns {weekStart, weekEnd} for the most recently completed week (last Mon~Sun). */
export function getLastCompletedWeek(reference: Date = new Date()): { weekStart: string; weekEnd: string } {
  const thisMonday = mondayOf(reference);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(lastSunday.getDate() - 1);
  return { weekStart: toISODate(lastMonday), weekEnd: toISODate(lastSunday) };
}

export function getPriorWeek(weekStart: string): { weekStart: string; weekEnd: string } {
  const start = new Date(weekStart + 'T00:00:00');
  start.setDate(start.getDate() - 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { weekStart: toISODate(start), weekEnd: toISODate(end) };
}

// ─── GA4 client (direct use for queries not exposed by ga4.service) ───

let _client: BetaAnalyticsDataClient | null = null;
function getDirectClient(): BetaAnalyticsDataClient {
  if (_client) return _client;
  const keyValue = config.ga4.serviceAccountKey;
  let credentials: Record<string, string>;
  if (config.ga4.clientEmail && config.ga4.privateKey) {
    credentials = {
      client_email: config.ga4.clientEmail,
      private_key: config.ga4.privateKey.replace(/\\n/g, '\n'),
    };
  } else if (keyValue.startsWith('{')) {
    credentials = JSON.parse(keyValue);
  } else if (keyValue.endsWith('.json')) {
    const keyPath = path.isAbsolute(keyValue)
      ? keyValue
      : path.resolve(__dirname, '../../', keyValue);
    credentials = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  } else {
    credentials = JSON.parse(Buffer.from(keyValue, 'base64').toString('utf-8'));
  }
  _client = new BetaAnalyticsDataClient({ credentials });
  return _client;
}

function getPropertyId(): string {
  return `properties/${config.ga4.propertyId}`;
}

// ─── Page group classifier (mirrors ga4-behavior.ts) ───

const PAGE_GROUPS: Record<string, (p: string) => boolean> = {
  '메인':        (p) => p === '/',
  '시험목록':     (p) => p === '/exam',
  '문제풀이':     (p) => /^\/exam\/\d+\/\d+/.test(p),
  '맞춤학습입구':  (p) => p === '/study',
  '맞춤학습설정':  (p) => p === '/study/custom',
  '키워드학습':   (p) => p === '/study/keyword',
  '학습세션':     (p) => p === '/study/session',
  '요약노트목록':  (p) => p === '/notes',
  '요약노트상세':  (p) => /^\/notes\/s\d/.test(p),
  '오답노트':     (p) => p.startsWith('/wrong-answers'),
  '내기록':       (p) => p.startsWith('/my-record'),
  '게시판':       (p) => p.startsWith('/board'),
};

// ─── GA4 queries ───

async function queryOverview(start: string, end: string) {
  const [resp] = await getDirectClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'engagementRate' },
    ],
  });
  const row = resp.rows?.[0]?.metricValues || [];
  const n = (i: number) => parseFloat(row[i]?.value || '0');
  return {
    sessions: n(0),
    users: n(1),
    newUsers: n(2),
    pageViews: n(3),
    avgSessionDuration: n(4),
    bounceRate: n(5),
    engagementRate: n(6),
  };
}

async function queryDaily(start: string, end: string) {
  const [resp] = await getDirectClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'totalUsers' }, { name: 'screenPageViews' }, { name: 'sessions' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
  return (resp.rows || []).map((r) => {
    const raw = r.dimensionValues?.[0]?.value || '';
    const date = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
    return {
      date,
      users: parseFloat(r.metricValues?.[0]?.value || '0'),
      pageViews: parseFloat(r.metricValues?.[1]?.value || '0'),
      sessions: parseFloat(r.metricValues?.[2]?.value || '0'),
    };
  });
}

async function queryChannels(start: string, end: string) {
  const [resp] = await getDirectClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });
  const rows = (resp.rows || []).map((r) => ({
    channel: r.dimensionValues?.[0]?.value || '',
    sessions: parseFloat(r.metricValues?.[0]?.value || '0'),
    users: parseFloat(r.metricValues?.[1]?.value || '0'),
  }));
  const total = rows.reduce((s, r) => s + r.sessions, 0) || 1;
  return rows.map((r) => ({ ...r, percentage: Math.round((r.sessions / total) * 100) }));
}

async function queryDevices(start: string, end: string) {
  const [resp] = await getDirectClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'sessions' }],
  });
  const rows = (resp.rows || []).map((r) => ({
    device: r.dimensionValues?.[0]?.value || '',
    sessions: parseFloat(r.metricValues?.[0]?.value || '0'),
  }));
  const total = rows.reduce((s, r) => s + r.sessions, 0) || 1;
  return rows.map((r) => ({ ...r, percentage: Math.round((r.sessions / total) * 100) }));
}

async function queryPages(start: string, end: string) {
  const [resp] = await getDirectClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'totalUsers' },
      { name: 'userEngagementDuration' },
      { name: 'sessions' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 500,
  });
  return (resp.rows || []).map((r) => {
    const pv = parseFloat(r.metricValues?.[0]?.value || '0');
    const eng = parseFloat(r.metricValues?.[2]?.value || '0');
    return {
      path: r.dimensionValues?.[0]?.value || '',
      pageViews: pv,
      users: parseFloat(r.metricValues?.[1]?.value || '0'),
      engagementPerView: pv > 0 ? eng / pv : 0,
      sessions: parseFloat(r.metricValues?.[3]?.value || '0'),
    };
  });
}

async function queryLandingPages(start: string, end: string) {
  const [resp] = await getDirectClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'landingPage' }],
    metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'engagementRate' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  });
  return (resp.rows || []).map((r) => ({
    path: r.dimensionValues?.[0]?.value || '',
    sessions: parseFloat(r.metricValues?.[0]?.value || '0'),
    bounceRate: parseFloat(r.metricValues?.[1]?.value || '0'),
    engagementRate: parseFloat(r.metricValues?.[2]?.value || '0'),
  }));
}

async function queryVideoEvents(start: string, end: string) {
  const [resp] = await getDirectClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: {
          values: ['video_play', 'video_complete', 'video_start', 'video_progress'],
        },
      },
    },
  });
  return (resp.rows || []).map((r) => ({
    name: r.dimensionValues?.[0]?.value || '',
    count: parseFloat(r.metricValues?.[0]?.value || '0'),
  }));
}

// ─── Orchestration ───

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function deriveExamFunnel(pages: Array<{ path: string; users: number; pageViews: number }>) {
  // Find most-visited exam round from this week
  const roundCounts = new Map<number, number>();
  for (const p of pages) {
    const m = p.path.match(/^\/exam\/(\d+)\/\d+/);
    if (m) {
      const round = parseInt(m[1], 10);
      roundCounts.set(round, (roundCounts.get(round) || 0) + p.users);
    }
  }
  const top = [...roundCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return [];
  const topRound = top[0];
  // Collect /exam/{topRound}/{qnum} pages
  const roundPages = pages
    .filter((p) => new RegExp(`^/exam/${topRound}/\\d+`).test(p.path))
    .sort((a, b) => {
      const qa = parseInt(a.path.split('/').pop() || '0', 10);
      const qb = parseInt(b.path.split('/').pop() || '0', 10);
      return qa - qb;
    });
  return roundPages.slice(0, 50).map((p) => ({
    page: p.path,
    users: p.users,
    pv: p.pageViews,
  }));
}

function deriveHighlights(snap: WeeklySnapshot): WeeklyHighlight[] {
  const h: WeeklyHighlight[] = [];
  h.push({
    label: '총 사용자',
    value: `${Math.round(snap.overview.users).toLocaleString()}명`,
    delta: `${snap.changes.users >= 0 ? '+' : ''}${snap.changes.users}%`,
    tone: snap.changes.users > 0 ? 'up' : snap.changes.users < 0 ? 'down' : 'flat',
  });
  h.push({
    label: '페이지뷰',
    value: `${Math.round(snap.overview.pageViews).toLocaleString()}`,
    delta: `${snap.changes.pageViews >= 0 ? '+' : ''}${snap.changes.pageViews}%`,
    tone: snap.changes.pageViews > 0 ? 'up' : snap.changes.pageViews < 0 ? 'down' : 'flat',
  });
  h.push({
    label: '평균 체류',
    value: `${(snap.overview.avgSessionDuration / 60).toFixed(1)}분`,
    delta: `${snap.changes.avgSessionDuration >= 0 ? '+' : ''}${snap.changes.avgSessionDuration}%`,
    tone: snap.changes.avgSessionDuration > 0 ? 'up' : 'down',
  });
  const videoPlays = snap.videoEvents.find((e) => e.name === 'video_play')?.count ?? 0;
  h.push({
    label: '영상 재생',
    value: `${Math.round(videoPlays).toLocaleString()}회`,
  });
  const notesDetail = snap.pageGroups['요약노트상세'];
  if (notesDetail) {
    h.push({
      label: '요약노트 정독',
      value: `${Math.round(notesDetail.pv).toLocaleString()} PV`,
    });
  }
  return h;
}

async function buildSnapshot(weekStart: string, weekEnd: string): Promise<WeeklySnapshot> {
  const prior = getPriorWeek(weekStart);

  const [curr, prev, daily, channels, devices, pages, landing, videoEvents] =
    await Promise.all([
      queryOverview(weekStart, weekEnd),
      queryOverview(prior.weekStart, prior.weekEnd),
      queryDaily(weekStart, weekEnd),
      queryChannels(weekStart, weekEnd),
      queryDevices(weekStart, weekEnd),
      queryPages(weekStart, weekEnd),
      queryLandingPages(weekStart, weekEnd),
      queryVideoEvents(weekStart, weekEnd),
    ]);

  const pageGroups: Record<string, { pv: number; sessions: number; engPerPV: number }> = {};
  for (const key of Object.keys(PAGE_GROUPS)) {
    pageGroups[key] = { pv: 0, sessions: 0, engPerPV: 0 };
  }
  const engSum: Record<string, number> = {};
  for (const p of pages) {
    for (const [key, fn] of Object.entries(PAGE_GROUPS)) {
      if (fn(p.path)) {
        pageGroups[key].pv += p.pageViews;
        pageGroups[key].sessions += p.sessions;
        engSum[key] = (engSum[key] || 0) + p.engagementPerView * p.pageViews;
        break;
      }
    }
  }
  for (const key of Object.keys(pageGroups)) {
    const pv = pageGroups[key].pv;
    pageGroups[key].engPerPV = pv > 0 ? (engSum[key] || 0) / pv : 0;
  }

  return {
    weekStart,
    weekEnd,
    overview: curr,
    changes: {
      sessions: pct(curr.sessions, prev.sessions),
      users: pct(curr.users, prev.users),
      pageViews: pct(curr.pageViews, prev.pageViews),
      avgSessionDuration: pct(curr.avgSessionDuration, prev.avgSessionDuration),
    },
    daily,
    channels,
    devices,
    topPages: pages.slice(0, 15).map((p) => ({
      path: p.path,
      pageViews: p.pageViews,
      users: p.users,
      engagementPerView: p.engagementPerView,
    })),
    pageGroups,
    landingPages: landing,
    videoEvents,
    examFunnel: deriveExamFunnel(pages),
  };
}

async function buildAiSummary(snap: WeeklySnapshot): Promise<string> {
  const prompt = `다음은 한국사능력검정시험 학습 사이트 "기출노트 한능검"의 주간 GA4 데이터입니다.
기간: ${snap.weekStart} ~ ${snap.weekEnd} (지난주 대비 변화율 포함)

[핵심 지표]
- 사용자: ${Math.round(snap.overview.users)}명 (${snap.changes.users >= 0 ? '+' : ''}${snap.changes.users}%)
- 페이지뷰: ${Math.round(snap.overview.pageViews)} (${snap.changes.pageViews >= 0 ? '+' : ''}${snap.changes.pageViews}%)
- 세션: ${Math.round(snap.overview.sessions)} (${snap.changes.sessions >= 0 ? '+' : ''}${snap.changes.sessions}%)
- 평균 체류: ${(snap.overview.avgSessionDuration / 60).toFixed(1)}분
- 참여율: ${(snap.overview.engagementRate * 100).toFixed(1)}%
- 신규 사용자 비율: ${((snap.overview.newUsers / Math.max(snap.overview.users, 1)) * 100).toFixed(0)}%

[페이지 그룹별 체류 품질 (PV / PV당 체류초)]
${Object.entries(snap.pageGroups)
  .filter(([, v]) => v.pv > 0)
  .sort((a, b) => b[1].pv - a[1].pv)
  .map(([k, v]) => `- ${k}: ${Math.round(v.pv)} PV / ${v.engPerPV.toFixed(1)}s`)
  .join('\n')}

[채널]
${snap.channels.slice(0, 5).map((c) => `- ${c.channel}: ${c.sessions} 세션 (${c.percentage}%)`).join('\n')}

[랜딩 TOP5]
${snap.landingPages.slice(0, 5).map((l) => `- ${l.path}: ${l.sessions}세션 · 이탈 ${(l.bounceRate * 100).toFixed(0)}%`).join('\n')}

[영상 재생 이벤트]
${snap.videoEvents.length === 0 ? '- 없음 (또는 이벤트 미수집)' : snap.videoEvents.map((e) => `- ${e.name}: ${e.count}`).join('\n')}

[77회 주목할 문제 (가장 많이 본 회차의 앞쪽 문제)]
${snap.examFunnel.slice(0, 10).map((f) => `- ${f.page}: ${f.users}명 도달`).join('\n') || '- 없음'}

위 데이터를 바탕으로 아래 3개 섹션으로 한국어 리포트를 작성해주세요. 각 섹션은 제목 없이 본문만, 3~5문장으로 구체 수치를 인용하며 실무자에게 유용하게.

## 이번 주 하이라이트
(전주 대비 가장 눈에 띄는 변화, 긍정/부정 둘 다)

## 사용자 행동 해석
(문제 풀이, 해설, 요약노트 사용 패턴. 완주율, 체류 품질 중심)

## 다음 주 주목 가설
(데이터에서 읽히는 개선 가능성 1~2개를 구체적 가설로)

각 섹션 제목(## …)은 그대로 유지해주세요. 불필요한 수사는 빼고 수치 중심으로.`;
  try {
    const text = await generateText(prompt, 'gemini-2.5-flash');
    return text.trim();
  } catch (err) {
    return `(AI 요약 생성 실패: ${(err as Error).message})`;
  }
}

// ─── Public API ───

export async function generateAndStoreWeeklyReport(
  weekStart?: string,
  weekEnd?: string
): Promise<WeeklyReportRow> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }
  if (!ga4.isConfigured()) {
    throw new Error('GA4 not configured');
  }
  let ws = weekStart;
  let we = weekEnd;
  if (!ws || !we) {
    const w = getLastCompletedWeek();
    ws = w.weekStart;
    we = w.weekEnd;
  }

  const snap = await buildSnapshot(ws, we);
  const highlights = deriveHighlights(snap);
  const aiSummary = await buildAiSummary(snap);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('weekly_reports')
    .upsert(
      {
        week_start: ws,
        week_end: we,
        data: snap,
        ai_summary: aiSummary,
        highlights,
        status: 'ready',
      },
      { onConflict: 'week_start' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as WeeklyReportRow;
}

export async function listWeeklyReports(limit = 26): Promise<WeeklyReportRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await getSupabase()
    .from('weekly_reports')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as WeeklyReportRow[];
}

export async function getWeeklyReport(weekStart: string): Promise<WeeklyReportRow | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from('weekly_reports')
    .select('*')
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error) throw error;
  return (data || null) as WeeklyReportRow | null;
}

export async function deleteWeeklyReport(weekStart: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabase()
    .from('weekly_reports')
    .delete()
    .eq('week_start', weekStart);
  if (error) throw error;
}
