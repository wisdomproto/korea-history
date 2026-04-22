import { useWeeklyReports, useGenerateWeeklyReport } from '../hooks/useWeeklyReports';
import type { WeeklyReport } from '../types/weekly-report.types';

interface Props {
  selectedWeekStart: string | null;
  onSelect: (weekStart: string) => void;
}

function formatWeekLabel(ws: string, we: string) {
  const a = new Date(ws);
  const b = new Date(we);
  const m = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${a.getFullYear()} · ${m(a)} – ${m(b)}`;
}

function toneColor(tone?: string) {
  if (tone === 'up') return 'text-emerald-600';
  if (tone === 'down') return 'text-red-500';
  return 'text-gray-500';
}

function Row({ r, active, onClick }: { r: WeeklyReport; active: boolean; onClick: () => void }) {
  const users = r.data?.overview?.users ?? 0;
  const pv = r.data?.overview?.pageViews ?? 0;
  const deltaU = r.data?.changes?.users ?? 0;
  const deltaPV = r.data?.changes?.pageViews ?? 0;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
        active
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-gray-200 bg-white hover:border-emerald-300'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[13px] font-bold text-gray-900">
          {formatWeekLabel(r.week_start, r.week_end)}
        </div>
        <div className="text-[10px] text-gray-400">
          {new Date(r.created_at).toLocaleDateString('ko-KR')}
        </div>
      </div>
      <div className="flex items-center gap-4 text-[11px]">
        <div>
          <span className="text-gray-500">사용자</span>{' '}
          <b className="text-gray-900">{Math.round(users).toLocaleString()}</b>
          <span className={`ml-1 ${toneColor(deltaU >= 0 ? 'up' : 'down')}`}>
            {deltaU >= 0 ? '+' : ''}{deltaU}%
          </span>
        </div>
        <div>
          <span className="text-gray-500">PV</span>{' '}
          <b className="text-gray-900">{Math.round(pv).toLocaleString()}</b>
          <span className={`ml-1 ${toneColor(deltaPV >= 0 ? 'up' : 'down')}`}>
            {deltaPV >= 0 ? '+' : ''}{deltaPV}%
          </span>
        </div>
      </div>
    </button>
  );
}

export default function WeeklyReportList({ selectedWeekStart, onSelect }: Props) {
  const { data, isLoading } = useWeeklyReports();
  const generate = useGenerateWeeklyReport();

  const configured = data?.configured;
  const reports = data?.reports ?? [];

  if (!isLoading && configured === false) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        <div className="text-3xl mb-2">📅</div>
        <div className="font-bold text-gray-900 mb-1">Supabase 미설정</div>
        <div className="text-xs">
          .env에 <code className="bg-gray-100 px-1 rounded">SUPABASE_URL</code>과{' '}
          <code className="bg-gray-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>를 설정해주세요.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
            Weekly Reports
          </div>
          <div className="text-xs text-gray-500">매주 월 07:00 자동 생성</div>
        </div>
        <button
          onClick={() => generate.mutate(undefined)}
          disabled={generate.isPending}
          className="rounded-lg bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-50"
        >
          {generate.isPending ? '생성 중…' : '지금 생성'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">
            아직 리포트가 없습니다.<br />
            <span className="text-gray-400">다음 월요일 07:00에 자동 생성되거나, 지금 생성 버튼을 눌러주세요.</span>
          </div>
        ) : (
          reports.map((r) => (
            <Row
              key={r.id}
              r={r}
              active={selectedWeekStart === r.week_start}
              onClick={() => onSelect(r.week_start)}
            />
          ))
        )}
      </div>
    </div>
  );
}
