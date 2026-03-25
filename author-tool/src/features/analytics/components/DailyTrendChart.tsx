import { useState } from 'react';
import { useDailyTrend } from '../hooks/useAnalytics';

type Period = '7d' | '30d';

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
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

export default function DailyTrendChart() {
  const [period, setPeriod] = useState<Period>('7d');
  const today = new Date();
  const startDate = period === '7d' ? addDays(today, -6) : addDays(today, -29);
  const endDate = today.toISOString().split('T')[0];

  const { data, isLoading } = useDailyTrend(startDate, endDate);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="text-sm font-extrabold mb-3">📈 날짜별 트래픽</div>
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-extrabold">📈 날짜별 트래픽</span>
        <div className="flex gap-1">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              period === '7d'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            7일
          </button>
          <button
            onClick={() => setPeriod('30d')}
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

      {/* Chart */}
      <div className="flex items-end gap-px h-40">
        {data.map((d) => {
          const height = Math.max((d.sessions / maxSessions) * 100, 2);
          const weekend = isWeekend(d.date);
          const barColor = weekend ? '#BFDBFE' : '#059669';
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
                  <div>세션: {d.sessions}</div>
                  <div>사용자: {d.users}</div>
                  <div>PV: {d.pageViews}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex mt-1.5">
        {data.map((d, i) => {
          // Show labels selectively to avoid crowding
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
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" /> 평일
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-200 inline-block" /> 주말
        </span>
        <span className="ml-auto">
          총 {data.reduce((s, d) => s + d.sessions, 0).toLocaleString()}세션
        </span>
      </div>
    </div>
  );
}
