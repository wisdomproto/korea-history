import type { KpiData } from '../types/analytics.types';

/**
 * North Star Metric Hero Card
 *
 * NSM = Weekly Active Learners (WAL)
 *  정의: 7일 내 의미있는 학습 행동을 한 unique user
 *  (정확한 측정은 GA4 custom event `question_answered` 등록 후 가능 — 현재는 users 기반 근사)
 *
 * 12개월 후 시나리오 (v3 마케팅 전략 §05 ⑤):
 *   보수 3K · 기본 10K · 낙관 35K
 */

const SCENARIOS = [
  { name: '보수', target: 3000, color: 'text-amber-600', bar: 'bg-amber-400' },
  { name: '기본', target: 10000, color: 'text-orange-700', bar: 'bg-orange-600' },
  { name: '낙관', target: 35000, color: 'text-teal-700', bar: 'bg-teal-600' },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}분 ${s.toString().padStart(2, '0')}초`;
}

function ChangeIndicator({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-xs text-gray-400">—</span>;
  const positive = value > 0;
  return (
    <span className={`text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? '▲' : '▼'} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

export default function NsmHeroCard({ data }: { data: KpiData }) {
  // WAL 근사치 — 7일 users 사용 (custom event 없을 때 proxy)
  // 향후 question_answered event 등록 시 정확 측정
  const walProxy = data.users;

  // 가장 가까운 다음 목표 찾기
  const nextScenario = SCENARIOS.find(s => walProxy < s.target) ?? SCENARIOS[2];
  const progress = Math.min((walProxy / nextScenario.target) * 100, 100);

  // PV/User
  const pvPerUser = data.users > 0 ? (data.pageViews / data.users) : 0;
  const pvPerUserChangePct = data.changes.users !== 0
    ? ((data.changes.pageViews / data.pageViews) - (data.changes.users / data.users)) * 100
    : 0;

  return (
    <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-5 text-stone-50 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] font-mono tracking-[0.18em] text-amber-300 font-bold uppercase">
            ★ North Star Metric
          </div>
          <h3 className="font-serif text-xl font-black mt-0.5 leading-tight">
            Weekly Active Learners
          </h3>
          <p className="text-[11px] text-stone-400 mt-1">
            7일 내 의미있는 학습 행동을 한 unique user · v3 §07 Measurement
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-stone-400">근사 (proxy)</div>
          <div className="text-[10px] font-mono text-amber-300">users (7일 기준)</div>
        </div>
      </div>

      {/* Big number + scenario progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
        <div className="md:col-span-1">
          <div className="font-serif text-5xl font-black text-amber-200 leading-none">
            {walProxy.toLocaleString()}
          </div>
          <div className="text-xs text-stone-400 mt-1">WAL ≈ {walProxy.toLocaleString()}명</div>
          <ChangeIndicator value={data.changes.users} />
        </div>

        <div className="md:col-span-2">
          <div className="text-[11px] font-mono text-stone-400 mb-1.5">
            12개월 후 시나리오 → 다음 목표 <span className="text-amber-300 font-bold">{nextScenario.name} {nextScenario.target.toLocaleString()}</span> ({progress.toFixed(1)}%)
          </div>
          <div className="h-3 bg-stone-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-500"
              style={{ width: `${Math.max(progress, 1)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-stone-300 font-mono">
            {SCENARIOS.map(s => (
              <div key={s.name} className="flex flex-col">
                <span className="text-stone-400">{s.name}</span>
                <span className={`font-bold ${walProxy >= s.target ? 'text-emerald-300' : 'text-stone-200'}`}>
                  {walProxy >= s.target ? '✓' : ''} {s.target.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub KPIs (input metrics) */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-stone-700">
        <div>
          <div className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">PV / User</div>
          <div className="font-serif text-2xl font-black text-stone-50 mt-0.5">{pvPerUser.toFixed(1)}</div>
          <div className="text-[10px] text-stone-400">
            EdTech 평균 2~3 대비 <span className="text-amber-300 font-bold">{(pvPerUser / 2.5).toFixed(1)}×</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">평균 세션</div>
          <div className="font-serif text-2xl font-black text-stone-50 mt-0.5">{formatDuration(data.avgSessionDuration)}</div>
          <div className="text-[10px] text-stone-400">
            EdTech 평균 1~3분 대비 강함
          </div>
        </div>
        <div>
          <div className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">총 PV</div>
          <div className="font-serif text-2xl font-black text-stone-50 mt-0.5">{data.pageViews.toLocaleString()}</div>
          <ChangeIndicator value={data.changes.pageViews} />
        </div>
      </div>

      <p className="text-[10px] text-stone-500 mt-3 italic">
        ※ WAL 정확 측정 = GA4 custom event <code className="bg-stone-700 px-1 rounded">question_answered</code> 등록 후 7일 unique user. 현재는 users (7일) 근사값.
      </p>
    </div>
  );
}
