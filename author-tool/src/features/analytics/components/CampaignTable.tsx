import type { CampaignData } from '../types/analytics.types';

export default function CampaignTable({ data }: { data: CampaignData[] }) {
  const items = data.slice(0, 10);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <h3 className="text-sm font-extrabold mb-3">🎯 캠페인 (UTM)</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">UTM 데이터 없음</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-gray-500 truncate">
                {c.source} / {c.medium}
              </span>
              <span className="font-bold">{c.sessions.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
