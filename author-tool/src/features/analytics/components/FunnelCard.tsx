import type { PageData } from '../types/analytics.types';

/**
 * AARRR Funnel — 페이지 카테고리를 단계별로 매핑
 * v3 마케팅 전략 §02 + §04 참조.
 *
 * TOFU (Awareness) — 첫 발견: /, /board, /privacy, /terms
 * MOFU (Consideration) — 둘러보기: /notes, /notes/*, /study (랜딩 페이지)
 * BOFU (Activation) — 실제 학습: /exam/*, /study/session, /study/custom
 * RET  (Retention) — 재방문 행동: /wrong-answers, /my-record
 */

type Stage = 'TOFU' | 'MOFU' | 'BOFU' | 'RET' | 'OTHER';

const STAGE_META: Record<Stage, { label: string; desc: string; color: string; bg: string; bar: string; icon: string }> = {
  'TOFU':  { label: 'TOFU · Awareness',     desc: '첫 발견 — 홈/게시판',        color: 'text-teal-700',   bg: 'bg-teal-50',   bar: 'bg-teal-500',   icon: '🔭' },
  'MOFU':  { label: 'MOFU · Consideration', desc: '둘러보기 — 노트/학습 랜딩',  color: 'text-amber-700',  bg: 'bg-amber-50',  bar: 'bg-amber-500',  icon: '📚' },
  'BOFU':  { label: 'BOFU · Activation',    desc: '실제 학습 — 문제 풀이',      color: 'text-rose-700',   bg: 'bg-rose-50',   bar: 'bg-rose-500',   icon: '🎯' },
  'RET':   { label: 'RET · Retention',      desc: '재방문 행동 — 오답/기록',    color: 'text-stone-800',  bg: 'bg-stone-100', bar: 'bg-stone-700',  icon: '🔁' },
  'OTHER': { label: 'OTHER',                desc: '기타',                       color: 'text-gray-500',   bg: 'bg-gray-50',   bar: 'bg-gray-400',   icon: '·' },
};

function classifyPage(path: string): Stage {
  if (path === '/' || path === '/board' || path === '/privacy' || path === '/terms') return 'TOFU';
  if (path.startsWith('/notes') || path === '/study') return 'MOFU';
  if (path.startsWith('/exam') || path.startsWith('/study/session') || path.startsWith('/study/custom')) return 'BOFU';
  if (path.startsWith('/wrong-answers') || path.startsWith('/my-record')) return 'RET';
  return 'OTHER';
}

export default function FunnelCard({ topPages }: { topPages: PageData[] }) {
  // Aggregate PV by stage
  const byStage: Record<Stage, { pv: number; pages: PageData[] }> = {
    'TOFU':  { pv: 0, pages: [] },
    'MOFU':  { pv: 0, pages: [] },
    'BOFU':  { pv: 0, pages: [] },
    'RET':   { pv: 0, pages: [] },
    'OTHER': { pv: 0, pages: [] },
  };

  topPages.forEach(p => {
    const s = classifyPage(p.path);
    byStage[s].pv += p.pageViews;
    byStage[s].pages.push(p);
  });

  const totalPv = Object.values(byStage).reduce((sum, v) => sum + v.pv, 0);
  const stages: Stage[] = ['TOFU', 'MOFU', 'BOFU', 'RET'];

  // Funnel transition (drop-off rate)
  const funnelOrder = stages.map(s => byStage[s].pv);
  const transitions = funnelOrder.slice(1).map((pv, i) => {
    const prev = funnelOrder[i];
    return prev > 0 ? (pv / prev) * 100 : 0;
  });

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] font-mono tracking-[0.18em] text-amber-600 font-bold uppercase">
            AARRR Funnel
          </div>
          <h3 className="font-serif text-lg font-black mt-0.5">페이지 카테고리 → Funnel 단계</h3>
          <p className="text-[11px] text-gray-500">v3 §02 — TOFU → MOFU → BOFU → RET (페이지 path 기반 자동 분류)</p>
        </div>
        <div className="text-right text-[11px] text-gray-500 font-mono">
          총 {totalPv.toLocaleString()} PV
        </div>
      </div>

      {/* Funnel stacked bars (vertical, decreasing width = drop-off visualization) */}
      <div className="space-y-2 mb-4">
        {stages.map((s, i) => {
          const m = STAGE_META[s];
          const data = byStage[s];
          const pct = totalPv > 0 ? (data.pv / totalPv) * 100 : 0;
          const transitionFromPrev = i > 0 ? transitions[i - 1] : 100;

          return (
            <div key={s}>
              <div className="flex items-center justify-between mb-1">
                <div className={`text-xs font-bold ${m.color}`}>
                  <span className="mr-1">{m.icon}</span>{m.label}
                </div>
                <div className="text-[11px] font-mono text-gray-700">
                  {data.pv.toLocaleString()} PV <span className="text-gray-500">({pct.toFixed(1)}%)</span>
                  {i > 0 && (
                    <span className="ml-2 text-[10px] text-gray-400">
                      → {transitionFromPrev.toFixed(0)}% of prev
                    </span>
                  )}
                </div>
              </div>
              <div className={`${m.bg} rounded-md p-2`}>
                <div className="h-3 bg-white/50 rounded overflow-hidden mb-1.5">
                  <div className={`h-full ${m.bar}`} style={{ width: `${Math.max(pct, 1.5)}%` }} />
                </div>
                <div className="text-[10px] text-gray-600 italic mb-1">{m.desc}</div>
                {data.pages.length > 0 && (
                  <div className="text-[10px] text-gray-700 font-mono leading-relaxed">
                    {data.pages.slice(0, 3).map(p => (
                      <span key={p.path} className="inline-block mr-2">
                        <code className="bg-white/60 px-1 rounded">{p.path}</code> {p.pageViews}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-gray-500 italic border-t border-gray-100 pt-2">
        ※ 깔때기 정상 패턴: TOFU &gt; MOFU &gt; BOFU &gt; RET (자연스러운 drop-off). RET 비중이 늘면 retention 자산화 신호.
      </div>
    </div>
  );
}
