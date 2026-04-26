import { useEffect } from 'react';
import { useEditorStore, type MarketingSubmenu } from '@/store/editor.store';

interface MenuItem {
  id: MarketingSubmenu;
  label: string;
  icon: string;
}

interface MenuGroup {
  label: string | null;
  items: MenuItem[];
}

/**
 * 사이트 단위 마케팅 — 브랜드/광고/GA4/채널 통합 관리.
 * 시험별 콘텐츠/발행/모니터링은 제외 (개별 시험 프로젝트로).
 */
const SITE_MENU: MenuGroup[] = [
  {
    label: null,
    items: [{ id: 'settings', label: '브랜드 / API 연동', icon: '⚙️' }],
  },
  {
    label: '유료 마케팅',
    items: [{ id: 'ads', label: '사이트 광고 통합', icon: '📣' }],
  },
  {
    label: '분석',
    items: [
      { id: 'site-analytics', label: 'GA4 사이트 분석', icon: '📊' },
      { id: 'channel-analytics', label: '채널 분석 (IG·YT)', icon: '📈' },
    ],
  },
  {
    label: '전략',
    items: [{ id: 'strategy', label: '사이트 마케팅 전략', icon: '🧭' }],
  },
];

/**
 * 시험별 마케팅 — 개별 ExamType (한능검·9급·자격증 등) 단위.
 * 시험 시즌 콘텐츠/광고/모니터링/경쟁사.
 */
const EXAM_MENU: MenuGroup[] = [
  {
    label: null,
    items: [{ id: 'settings', label: '시험 설정 / 글쓰기 가이드', icon: '⚙️' }],
  },
  {
    label: '오가닉 마케팅',
    items: [
      { id: 'ideas', label: '키워드 / 아이디어', icon: '💡' },
      { id: 'content', label: '콘텐츠 생성', icon: '📝' },
      { id: 'publish', label: '발행', icon: '🚀' },
    ],
  },
  {
    label: '성장',
    items: [{ id: 'monitoring', label: '모니터링 / 댓글', icon: '💬' }],
  },
  {
    label: '유료 마케팅',
    items: [{ id: 'ads', label: '시험 시즌 광고', icon: '📣' }],
  },
  {
    label: '분석',
    items: [{ id: 'competitor', label: '경쟁사', icon: '🎯' }],
  },
  {
    label: '전략',
    items: [{ id: 'strategy', label: '시험 마케팅 전략', icon: '🧭' }],
  },
];

interface MarketingSubmenuProps {
  scope?: 'site' | 'exam';
}

export function MarketingSubmenu({ scope = 'exam' }: MarketingSubmenuProps) {
  const { marketingSubmenu, setMarketingSubmenu } = useEditorStore();
  const MENU = scope === 'site' ? SITE_MENU : EXAM_MENU;

  // scope이 바뀌었는데 현재 선택된 메뉴가 새 scope에 없으면 첫 메뉴로 reset
  useEffect(() => {
    const allIds = MENU.flatMap((g) => g.items.map((i) => i.id));
    if (marketingSubmenu && !allIds.includes(marketingSubmenu)) {
      setMarketingSubmenu(allIds[0]);
    }
  }, [scope, marketingSubmenu, setMarketingSubmenu, MENU]);

  return (
    <nav className="flex flex-col gap-0.5 px-2 py-2">
      {MENU.map((group, gi) => (
        <div key={gi} className="mb-1">
          {group.label && (
            <div className="mt-2 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {group.label}
            </div>
          )}
          {group.items.map((item) => {
            const active = marketingSubmenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setMarketingSubmenu(item.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors ${
                  active
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {active && <span className="text-emerald-500">●</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
