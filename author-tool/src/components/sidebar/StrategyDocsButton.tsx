import { useState, useRef, useEffect } from 'react';

/**
 * 전략 / 마케팅 / 수익화 문서 바로가기 (왼쪽 아래 footer).
 *
 * 새 문서 추가 방법:
 * 1. docs/ 폴더에 .html 파일 추가
 * 2. 아래 STRATEGY_DOCS 배열에 한 줄 추가
 * 3. 끝.
 *
 * 서버는 /docs 경로로 자동 정적 서빙 (server/index.ts 참조).
 */

interface StrategyDoc {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  /** docs/ 폴더 기준 경로 (예: 'multi-exam-hub-strategy-v3.html') */
  file: string;
  badge?: 'NEW' | 'UPDATED' | null;
}

const STRATEGY_DOCS: StrategyDoc[] = [
  // ─── SEO ───
  {
    id: 'seo-strategy',
    icon: '🔍',
    title: 'SEO 전략 v1.1 ⭐ 최신',
    subtitle: 'GSC 실데이터 + Quick Win 7 + 황금키워드 + 브랜드 SEO',
    file: 'seo-strategy.html',
    badge: 'NEW',
  },
  // ─── 통합 마케팅 전략 ───
  {
    id: 'strategy-v3',
    icon: '🎯',
    title: '마케팅 전략 v3 (통합 허브)',
    subtitle: 'STP · JTBD · CAC/LTV · OKR · NSM',
    file: 'multi-exam-hub-strategy-v3.html',
    badge: 'UPDATED',
  },
  {
    id: 'business-growth',
    icon: '📈',
    title: '사업 성장 플레이북',
    subtitle: '광고 교양 · 용어 사전 · 성장 전략 전체',
    file: 'business-growth-playbook.html',
    badge: null,
  },
  {
    id: 'marketing-strategy-v1',
    icon: '📣',
    title: '마케팅 전략 v1 (통합)',
    subtitle: '채널 우선순위 · 로드맵 · KPI',
    file: 'marketing-strategy.html',
    badge: null,
  },
  {
    id: 'marketing-community',
    icon: '👥',
    title: '커뮤니티 마케팅 플랜',
    subtitle: '디시 · 카카오톡 · 맘카페 채널 리스트',
    file: 'marketing-plan-community.html',
    badge: null,
  },
  // ─── 광고 / 수익화 ───
  {
    id: 'monetization',
    icon: '💰',
    title: '광고 / 수익화 대안',
    subtitle: '카카오 애드핏 · AdSense · 학원 BD · 멤버십',
    file: 'monetization-alternatives.html',
    badge: null,
  },
  {
    id: 'ad-placement-spec',
    icon: '📐',
    title: '광고 위치 Spec',
    subtitle: 'AdSlot · 5곳 매핑 · ENV · 활성화 절차',
    file: 'ad-placement-spec.html',
    badge: null,
  },
  // ─── 채널별 전략 ───
  {
    id: 'youtube-seo',
    icon: '📺',
    title: '유튜브 SEO 전략',
    subtitle: '제목 · 썸네일 · 태그 · 채널 성장',
    file: 'youtube-seo-strategy.html',
    badge: null,
  },
  {
    id: 'instagram-reel',
    icon: '📱',
    title: '인스타 릴스 가이드',
    subtitle: '훅 · 스토리텔링 · 해시태그 · 알고리즘',
    file: 'instagram-reel-guide.html',
    badge: null,
  },
  // ─── 분석 / 경쟁사 ───
  {
    id: 'ga4-analysis',
    icon: '📊',
    title: 'GA4 분석 리포트',
    subtitle: '30일 스냅샷 + 광고 수익 예측',
    file: 'ga4-analysis-report.html',
    badge: null,
  },
  {
    id: 'competitor-analysis',
    icon: '🎯',
    title: '경쟁사 분석 (무료 기출)',
    subtitle: '공기출 · comcbt · 맞추다 + 우리 moat 5개',
    file: 'competitor-free-exam-sites.html',
    badge: null,
  },
  // 새 문서는 여기에 한 줄 추가
];

const BADGE_STYLE = {
  NEW: 'bg-rose-100 text-rose-700 border-rose-200',
  UPDATED: 'bg-amber-100 text-amber-700 border-amber-200',
};

function buildDocUrl(file: string): string {
  // dev: localhost:3001/docs/xxx.html
  // prod: 같은 origin에서 /docs/xxx.html
  return `/docs/${file}`;
}

export function StrategyDocsButton({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // ─── Collapsed sidebar: 단일 아이콘 ───
  if (collapsed) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`p-1.5 rounded-lg text-sm transition-colors ${
            open ? 'bg-amber-100' : 'hover:bg-gray-100'
          }`}
          title="전략 문서"
        >
          📋
        </button>
        {open && (
          <DocsPopover docs={STRATEGY_DOCS} onClose={() => setOpen(false)} side="right" />
        )}
      </div>
    );
  }

  // ─── Expanded sidebar: 라벨 버튼 + popover ───
  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
          open
            ? 'bg-amber-100 text-amber-800'
            : 'bg-white text-gray-600 hover:bg-amber-50 hover:text-amber-700 border border-gray-200'
        }`}
        title="전략 / 마케팅 / 수익화 문서"
      >
        <span className="flex items-center gap-1.5">
          <span>📋</span>
          <span>전략 문서</span>
          <span className="text-[9px] font-mono text-gray-400">({STRATEGY_DOCS.length})</span>
        </span>
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <DocsPopover docs={STRATEGY_DOCS} onClose={() => setOpen(false)} side="up" />
      )}
    </div>
  );
}

function DocsPopover({
  docs,
  onClose,
  side,
}: {
  docs: StrategyDoc[];
  onClose: () => void;
  side: 'up' | 'right';
}) {
  const positionClass =
    side === 'up'
      ? 'bottom-full mb-2 left-0 right-0'
      : 'left-full ml-2 bottom-0 w-72';

  return (
    <div
      className={`absolute z-50 ${positionClass} rounded-xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden`}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-amber-50/40">
        <div className="text-[9px] font-mono tracking-[0.16em] text-amber-700 font-bold uppercase">
          Strategy Library
        </div>
        <div className="text-[11px] text-gray-600 mt-0.5">새 탭에서 열림</div>
      </div>

      {/* List */}
      <ul className="max-h-80 overflow-y-auto py-1">
        {docs.map((doc) => (
          <li key={doc.id}>
            <a
              href={buildDocUrl(doc.file)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-amber-50/60 transition-colors group"
            >
              <span className="text-lg leading-none mt-0.5">{doc.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-800 group-hover:text-amber-800 truncate">
                    {doc.title}
                  </span>
                  {doc.badge && (
                    <span className={`text-[8px] font-mono font-bold px-1 py-px rounded border ${BADGE_STYLE[doc.badge]}`}>
                      {doc.badge}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                  {doc.subtitle}
                </div>
              </div>
              <svg className="h-3 w-3 text-gray-300 group-hover:text-amber-500 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </li>
        ))}
      </ul>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 text-[9px] text-gray-400 font-mono">
        + 새 문서: <code className="bg-white px-1 rounded">docs/*.html</code> 추가 → StrategyDocsButton.tsx 배열에 1줄
      </div>
    </div>
  );
}
