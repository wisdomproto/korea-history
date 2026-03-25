import type { KpiData } from '../types/analytics.types';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-gray-400">—</span>;
  const positive = value > 0;
  return (
    <span className={`text-xs font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

const metrics: Array<{
  key: keyof Omit<KpiData, 'changes'>;
  label: string;
  format: (v: number) => string;
}> = [
  { key: 'sessions', label: '세션', format: (v) => v.toLocaleString() },
  { key: 'users', label: '사용자', format: (v) => v.toLocaleString() },
  { key: 'pageViews', label: '페이지뷰', format: (v) => v.toLocaleString() },
  { key: 'avgSessionDuration', label: '평균 체류시간', format: formatDuration },
];

export default function KpiCards({ data }: { data: KpiData }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <h3 className="text-sm font-extrabold mb-3">📊 주요 지표</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.key} className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-xs text-gray-500">{m.label}</div>
            <div className="text-2xl font-bold text-black mt-1">{m.format(data[m.key])}</div>
            <ChangeIndicator value={data.changes[m.key]} />
          </div>
        ))}
      </div>
    </div>
  );
}
