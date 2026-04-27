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
  {
    id: 'strategy-v3',
    icon: '🎯',
    title: '마케팅 전략 v3',
    subtitle: 'STP · JTBD · CAC/LTV · OKR · NSM',
    file: 'multi-exam-hub-strategy-v3.html',
    badge: 'UPDATED',
  },
  {
    id: 'monetization',
    icon: '💰',
    title: '광고 / 수익화 대안',
    subtitle: '카카오 애드핏 · AdSense · 학원 BD · 멤버십',
    file: 'monetization-alternatives.html',
    badge: 'NEW',
  },
  {
    id: 'ad-placement-spec',
    icon: '📐',
    title: '광고 위치 Spec',
    subtitle: 'AdSlot · 5곳 매핑 · ENV · 활성화 절차',
    file: 'ad-placement-spec.html',
    badge: 'NEW',
  },
  {
    id: 'competitor-analysis',
    icon: '🎯',
    title: '경쟁사 분석 (무료 기출)',
    subtitle: '공기출 · comcbt · 맞추다 + 우리 moat 5개',
    file: 'competitor-free-exam-sites.html',
    badge: 'NEW',
  },
  {
    id: 'admin-law-pilot-report',
    icon: '📊',
    title: '행정법 Pilot v1 보고서 ⭐ 먼저 보기',
    subtitle: '커버리지 95% / 6단계 / 다음 단계 권장',
    file: 'admin-law-pilot-report.html',
    badge: 'NEW',
  },
  {
    id: 'admin-law-pilot',
    icon: '⚖️',
    title: '행정법 자동 단권화 (커버리지 100%)',
    subtitle: '10회 200문제 → 27단원 / 학원 단권화 수준',
    file: 'admin-law-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'admin-pa',
    icon: '🏛️',
    title: '행정학개론 자동 단권화',
    subtitle: '10회 200문제 → 12단원 / 정책·인사·재무·조직',
    file: 'admin-pa-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'criminal-law',
    icon: '⚖️',
    title: '형법총론 자동 단권화',
    subtitle: '10회 200문제 → 13단원 / 공범·미수·위법성',
    file: 'criminal-law-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'criminal-procedure',
    icon: '👮',
    title: '형사소송법개론 자동 단권화',
    subtitle: '10회 200문제 → 14단원 / 증거·수사·공판',
    file: 'criminal-procedure-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'accounting',
    icon: '📊',
    title: '회계학 자동 단권화',
    subtitle: '10회 200문제 → 11단원 / K-IFRS + 정부회계',
    file: 'accounting-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'tax-law',
    icon: '💰',
    title: '세법개론 자동 단권화',
    subtitle: '10회 200문제 → 9단원 / 법인세·소득세·부가세',
    file: 'tax-law-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'corrections',
    icon: '🔒',
    title: '교정학개론 자동 단권화',
    subtitle: '10회 200문제 → 10단원 / 형집행·범죄학',
    file: 'corrections-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'social-welfare',
    icon: '🤝',
    title: '사회복지학개론 자동 단권화',
    subtitle: '10회 200문제 → 12단원 / 정책·실천·복지국가',
    file: 'social-welfare-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'education',
    icon: '🎓',
    title: '교육학개론 자동 단권화',
    subtitle: '10회 200문제 → 12단원 / 심리·행정·과정',
    file: 'education-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'international-law',
    icon: '🌐',
    title: '국제법개론 자동 단권화',
    subtitle: '10회 200문제 → 13단원 / UN·조약·해양·WTO',
    file: 'international-law-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'customs-law',
    icon: '🛂',
    title: '관세법개론 자동 단권화',
    subtitle: '10회 200문제 → 9단원 / 통관·과세·보세',
    file: 'customs-law-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'korean',
    icon: '📖',
    title: '국어 자동 단권화 (공통)',
    subtitle: '10회 196문제 → 9단원 / PSAT형 독해 50%',
    file: 'korean-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'english',
    icon: '🔤',
    title: '영어 자동 단권화 (공통)',
    subtitle: '10회 198문제 → 8단원 / 어휘 100선 + 어법',
    file: 'english-summary-note.html',
    badge: 'NEW',
  },
  // 7급/PSAT
  {
    id: 'constitution',
    icon: '⚖️',
    title: '헌법 자동 단권화 (7급/PSAT)',
    subtitle: '8회 200문제 → 15단원 / 5급·7급·법원직',
    file: 'constitution-summary-note.html',
    badge: 'NEW',
  },
  // 자격증
  {
    id: 'engineer-info-processing',
    icon: '💻',
    title: '정보처리기사 자동 단권화',
    subtitle: '58회 5800문제 → 10단원 / SDLC·DB·네트워크',
    file: 'engineer-info-processing-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'industrial-safety-engineer',
    icon: '🦺',
    title: '산업안전기사 자동 단권화',
    subtitle: '60회 7199문제 → 10단원 / 안전관리·산안법',
    file: 'industrial-safety-engineer-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'realtor-1',
    icon: '🏠',
    title: '공인중개사 1차 자동 단권화',
    subtitle: '20회 1600문제 → 10단원 / 부동산학·민법',
    file: 'realtor-1-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'realtor-2',
    icon: '🏘️',
    title: '공인중개사 2차 자동 단권화',
    subtitle: '20회 2400문제 → 10단원 / 공법·세법·실무',
    file: 'realtor-2-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'computer-skills-1',
    icon: '🖥️',
    title: '컴퓨터활용능력 1급 자동 단권화',
    subtitle: '58회 3480문제 → 10단원 / Excel·Access',
    file: 'computer-skills-1-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'accounting-cert-1',
    icon: '🧾',
    title: '전산회계 1급 자동 단권화',
    subtitle: '97회 1455문제 → 10단원 / 회계·원가·부가세',
    file: 'accounting-cert-1-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'electrical-engineer',
    icon: '⚡',
    title: '전기기사 자동 단권화',
    subtitle: '59회 5900문제 → 10단원 / 전자기·전력·기기',
    file: 'electrical-engineer-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'social-research-2',
    icon: '📊',
    title: '사회조사분석사 2급 자동 단권화',
    subtitle: '46회 4600문제 → 10단원 / 조사방법·통계',
    file: 'social-research-2-summary-note.html',
    badge: 'NEW',
  },
  {
    id: 'career-counselor-2',
    icon: '💼',
    title: '직업상담사 2급 자동 단권화',
    subtitle: '39회 3900문제 → 10단원 / 진로이론·검사',
    file: 'career-counselor-2-summary-note.html',
    badge: 'NEW',
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
