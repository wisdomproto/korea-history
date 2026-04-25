import { useState } from 'react';
import { InstagramTab } from './InstagramTab';
import { YouTubeTab } from './YouTubeTab';

type Tab = 'instagram' | 'youtube' | 'threads' | 'naver_blog';

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'youtube', label: 'YouTube', icon: '🎬' },
  { key: 'threads', label: 'Threads', icon: '🧵' },
  { key: 'naver_blog', label: 'N 블로그', icon: '📗' },
];

function StubTab({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="text-base font-bold mb-1">{title}</h3>
      <p className="text-xs text-gray-500 max-w-md mx-auto">{description}</p>
      <span className="inline-block mt-3 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[10px] font-semibold text-amber-700">
        🚧 향후 추가
      </span>
    </div>
  );
}

export function ChannelAnalyticsView() {
  const [tab, setTab] = useState<Tab>('instagram');

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h2 className="text-lg font-extrabold text-gray-900">📈 채널 분석</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Instagram · YouTube · Threads · 네이버 블로그 채널 지표를 한 화면에서 비교합니다.
        </p>
      </div>

      <div className="border-b border-gray-200 bg-white px-6 flex gap-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                active ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{t.icon}</span>
              <span className="text-[13px] font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'instagram' && <InstagramTab />}
        {tab === 'youtube' && <YouTubeTab />}
        {tab === 'threads' && (
          <StubTab
            icon="🧵"
            title="Threads 채널 분석"
            description="Meta Threads API는 현재 베타 단계로 통계 데이터 접근이 제한적입니다. API가 안정화되면 도달·답글·재게시 등 핵심 지표가 추가됩니다."
          />
        )}
        {tab === 'naver_blog' && (
          <StubTab
            icon="📗"
            title="네이버 블로그 분석"
            description="네이버 블로그는 공식 분석 API를 제공하지 않습니다. 향후 RSS 크롤링 기반의 방문자/체류시간/이웃 추적과 GSC 데이터(블로그 도메인) 결합 분석이 추가될 예정입니다."
          />
        )}
      </div>
    </div>
  );
}
