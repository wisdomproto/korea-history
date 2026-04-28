import type { KpiData, ChannelData } from '../types/analytics.types';

/**
 * Counter Metrics — "너무 좋아 보이면 의심할 역지표"
 * v3 마케팅 전략 §07 Measurement Framework 참조.
 *
 * 4개 지표:
 *  1. Direct 비율 변화 (하락 = retention 약화)
 *  2. 세션당 페이지 (낮으면 콘텐츠 약함)
 *  3. 평균 세션 변화 (짧아지면 위험)
 *  4. PV 성장 vs Users 성장 비율 (불균형 = WAL 약화)
 */

type Severity = 'good' | 'watch' | 'warn' | 'unknown';

const SEV_META: Record<Severity, { color: string; bg: string; border: string; icon: string; label: string }> = {
  'good':    { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅', label: 'OK' },
  'watch':   { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: '👀', label: 'Watch' },
  'warn':    { color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    icon: '⚠️', label: 'Warn' },
  'unknown': { color: 'text-gray-500',    bg: 'bg-gray-50',    border: 'border-gray-200',    icon: '·',   label: '—' },
};

function judgePvPerSession(pvPerSession: number): Severity {
  if (pvPerSession >= 8) return 'good';
  if (pvPerSession >= 4) return 'watch';
  return 'warn';
}

function judgeAvgSession(seconds: number): Severity {
  if (seconds >= 300) return 'good'; // 5분+
  if (seconds >= 120) return 'watch'; // 2분+
  return 'warn';
}

function judgeDirectRatio(directPct: number, change: number): Severity {
  if (directPct >= 50 && change >= -5) return 'good';
  if (directPct >= 30 || change >= -15) return 'watch';
  return 'warn';
}

function judgePvVsUsers(pvChange: number, userChange: number): Severity {
  // 사용자 증가가 PV 증가를 너무 앞서면 acquisition만 늘고 engagement는 약화
  if (userChange === 0 || pvChange === 0) return 'unknown';
  const ratio = pvChange / userChange;
  if (ratio >= 0.8) return 'good';
  if (ratio >= 0.4) return 'watch';
  return 'warn';
}

export default function CounterMetricsCard({
  overview,
  channels,
}: {
  overview: KpiData;
  channels: ChannelData[];
}) {
  // PV per session
  const pvPerSession = overview.sessions > 0 ? overview.pageViews / overview.sessions : 0;
  const sev1 = judgePvPerSession(pvPerSession);

  // 평균 세션 (초 단위)
  const sev2 = judgeAvgSession(overview.avgSessionDuration);

  // Direct 비율
  const directChannel = channels.find(c => c.channel.toLowerCase() === 'direct');
  const directPct = directChannel?.percentage ?? 0;
  // Direct 변화는 데이터에 없어서 추정 (현재 비율만 표시, 변화는 0으로 처리)
  const sev3 = judgeDirectRatio(directPct, 0);

  // PV vs Users growth rate
  const pvChange = overview.changes.pageViews;
  const userChange = overview.changes.users;
  const sev4 = judgePvVsUsers(pvChange, userChange);

  const metrics = [
    {
      key: 'pvPerSession',
      title: '세션당 페이지 (Engagement)',
      value: pvPerSession.toFixed(1),
      desc: pvPerSession >= 8 ? '강력' : pvPerSession >= 4 ? '평균' : '낮음 — 콘텐츠 점검',
      severity: sev1,
      target: '목표 ≥ 8',
    },
    {
      key: 'avgSession',
      title: '평균 세션 시간',
      value: `${Math.floor(overview.avgSessionDuration / 60)}분 ${(overview.avgSessionDuration % 60).toFixed(0).padStart(2, '0')}초`,
      desc: overview.avgSessionDuration >= 300 ? 'EdTech 평균 ×2~4' : overview.avgSessionDuration >= 120 ? '평균 수준' : '짧음 — UX 점검',
      severity: sev2,
      target: '목표 ≥ 5분',
    },
    {
      key: 'directRatio',
      title: 'Direct 비율 (Retention proxy)',
      value: `${directPct.toFixed(1)}%`,
      desc: directPct >= 50 ? '북마크 강함' : directPct >= 30 ? '평균' : '낮음 — 광고 의존 신호',
      severity: sev3,
      target: '목표 ≥ 50%',
    },
    {
      key: 'pvVsUsers',
      title: 'PV ↔ Users 성장 균형',
      value: pvChange === 0 || userChange === 0 ? 'N/A' : `${(pvChange / userChange).toFixed(1)}×`,
      desc: sev4 === 'good' ? '균형 OK' : sev4 === 'watch' ? '주의' : sev4 === 'warn' ? 'Acq만 ↑ engagement ↓' : '데이터 부족',
      severity: sev4,
      target: '목표 ≥ 0.8',
    },
  ];

  // Top severity
  const order: Severity[] = ['warn', 'watch', 'good', 'unknown'];
  const worstSev = order.find(s => metrics.some(m => m.severity === s)) ?? 'good';
  const headerMeta = SEV_META[worstSev];

  return (
    <div className={`${headerMeta.bg} rounded-2xl p-5 border-2 ${headerMeta.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className={`text-[10px] font-mono tracking-[0.18em] ${headerMeta.color} font-bold uppercase`}>
            ⚠️ Counter Metrics
          </div>
          <h3 className="font-serif text-lg font-black mt-0.5">너무 좋아 보이면 의심할 4개 역지표</h3>
          <p className="text-[11px] text-gray-600">v3 §07 — 위 카드 숫자가 좋아도 아래 4개 중 하나라도 'Warn'이면 stop &amp; review</p>
        </div>
        <div className={`text-[11px] font-mono ${headerMeta.color} font-bold uppercase tracking-wider`}>
          {headerMeta.icon} {headerMeta.label}
        </div>
      </div>

      {/* 4 counter metrics in 2x2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {metrics.map(m => {
          const meta = SEV_META[m.severity];
          return (
            <div key={m.key} className={`${meta.bg} rounded-lg p-3 border ${meta.border}`}>
              <div className="flex items-start justify-between mb-1">
                <div className={`text-[11px] font-bold ${meta.color}`}>{m.title}</div>
                <span className={`text-[10px] font-mono ${meta.color}`}>{meta.icon} {meta.label}</span>
              </div>
              <div className="font-serif text-2xl font-black text-stone-900 leading-none mt-1">{m.value}</div>
              <div className="text-[11px] text-gray-700 mt-1">{m.desc}</div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">{m.target}</div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-500 mt-3 italic">
        ※ 광고비/매출 비율 (5번째 counter)은 AdSense LIVE 후 자동 추가 예정.
      </p>
    </div>
  );
}
