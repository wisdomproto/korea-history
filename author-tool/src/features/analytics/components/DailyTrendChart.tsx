import { useState } from 'react';
import { useDailyTrend } from '../hooks/useAnalytics';
import type { DailyData } from '../types/analytics.types';

type Period = '7d' | '30d';
type Metric = 'pageViews' | 'users' | 'avgSessionDuration' | 'durationPerPV';

const METRIC_CONFIG: Record<Metric, { label: string; unit: string; color: string; weekendColor: string }> = {
  pageViews: { label: 'PV', unit: '', color: '#059669', weekendColor: '#BFDBFE' },
  users: { label: '사용자', unit: '명', color: '#7C3AED', weekendColor: '#DDD6FE' },
  avgSessionDuration: { label: '체류시간', unit: '', color: '#D97706', weekendColor: '#FDE68A' },
  durationPerPV: { label: 'PV당 체류', unit: '', color: '#DC2626', weekendColor: '#FECACA' },
};

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatRangeLabel(startStr: string, endStr: string): string {
  const s = new Date(startStr + 'T00:00:00');
  const e = new Date(endStr + 'T00:00:00');
  return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`;
}

function getDayName(dateStr: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const d = new Date(dateStr + 'T00:00:00');
  return days[d.getDay()];
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

function getMetricValue(d: DailyData, metric: Metric): number {
  if (metric === 'durationPerPV') {
    return d.pageViews > 0 ? Math.round((d.avgSessionDuration * d.sessions) / d.pageViews) : 0;
  }
  return d[metric];
}

export default function DailyTrendChart() {
  const [period, setPeriod] = useState<Period>('7d');
  const [metric, setMetric] = useState<Metric>('pageViews');
  const [offset, setOffset] = useState(0); // 0 = current, -1 = prev week/month, etc.

  const today = new Date();
  const days = period === '7d' ? 7 : 30;
  const endDate = toDateStr(addDays(today, offset * days));
  const startDate = toDateStr(addDays(new Date(endDate + 'T00:00:00'), -(days - 1)));

  // Don't allow navigating into the future
  const isLatest = offset === 0;

  const { data, isLoading } = useDailyTrend(startDate, endDate);
  const config = METRIC_CONFIG[metric];

  // Reset offset when period changes
  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    setOffset(0);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="text-sm font-extrabold mb-3">📈 날짜별 트래픽</div>
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => getMetricValue(d, metric)), 1);
  const total = data.reduce((s, d) => s + getMetricValue(d, metric), 0);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-extrabold">📈 날짜별 트래픽</span>
        <div className="flex gap-1">
          <button
            onClick={() => handlePeriodChange('7d')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              period === '7d'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            7일
          </button>
          <button
            onClick={() => handlePeriodChange('30d')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              period === '30d'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            30일
          </button>
        </div>
      </div>

      {/* Period Navigation */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
          {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                metric === m
                  ? 'text-white'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
              style={metric === m ? { backgroundColor: METRIC_CONFIG[m].color } : undefined}
            >
              {METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOffset(offset - 1)}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs"
          >
            ‹
          </button>
          <span className="text-[11px] text-gray-500 font-medium min-w-[90px] text-center">
            {formatRangeLabel(startDate, endDate)}
          </span>
          <button
            onClick={() => setOffset(offset + 1)}
            disabled={isLatest}
            className={`w-6 h-6 flex items-center justify-center rounded-md text-xs ${
              isLatest
                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            ›
          </button>
          {!isLatest && (
            <button
              onClick={() => setOffset(0)}
              className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-semibold hover:bg-emerald-100"
            >
              오늘
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-px h-40">
        {data.map((d) => {
          const value = getMetricValue(d, metric);
          const height = Math.max((value / maxValue) * 100, 2);
          const weekend = isWeekend(d.date);
          const barColor = weekend ? config.weekendColor : config.color;
          return (
            <div
              key={d.date}
              className="flex-1 group relative cursor-default"
              style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
            >
              <div
                className="w-full rounded-t-sm transition-opacity hover:opacity-80"
                style={{ height: `${height}%`, backgroundColor: barColor, minHeight: '2px' }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                  <div className="font-bold">{formatDate(d.date)} ({getDayName(d.date)})</div>
                  <div>PV: {d.pageViews.toLocaleString()}</div>
                  <div>사용자: {d.users.toLocaleString()}</div>
                  <div>체류시간: {formatDuration(d.avgSessionDuration)}</div>
                  <div>PV당: {formatDuration(d.pageViews > 0 ? Math.round((d.avgSessionDuration * d.sessions) / d.pageViews) : 0)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex mt-1.5">
        {data.map((d, i) => {
          const showLabel = period === '7d'
            ? true
            : (i === 0 || i === data.length - 1 || i % 7 === 0);
          return (
            <div key={d.date} className="flex-1 text-center">
              {showLabel && (
                <span className={`text-[9px] ${isWeekend(d.date) ? 'text-blue-400' : 'text-gray-400'}`}>
                  {formatDate(d.date)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: config.color }} /> 평일
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: config.weekendColor }} /> 주말
        </span>
        <span className="ml-auto">
          {metric === 'avgSessionDuration' || metric === 'durationPerPV'
            ? `평균 ${formatDuration(Math.round(total / data.length))}`
            : `총 ${total.toLocaleString()}${config.unit}`
          }
        </span>
      </div>
    </div>
  );
}
