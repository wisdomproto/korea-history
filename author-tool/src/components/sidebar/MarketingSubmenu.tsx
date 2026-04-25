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

const MENU: MenuGroup[] = [
  {
    label: null,
    items: [{ id: 'settings', label: '프로젝트 설정', icon: '⚙️' }],
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
    items: [{ id: 'ads', label: '광고 관리', icon: '📣' }],
  },
  {
    label: '분석',
    items: [
      { id: 'site-analytics', label: '사이트 분석', icon: '📊' },
      { id: 'channel-analytics', label: '채널 분석', icon: '📈' },
      { id: 'competitor', label: '경쟁사', icon: '🎯' },
    ],
  },
  {
    label: '전략',
    items: [{ id: 'strategy', label: '마케팅 전략', icon: '🧭' }],
  },
];

export function MarketingSubmenu() {
  const { marketingSubmenu, setMarketingSubmenu } = useEditorStore();

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
