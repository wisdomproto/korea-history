import type { ChannelData } from '../types/analytics.types';

const COLORS = ['#059669', '#2563EB', '#7C3AED', '#EC4899', '#F59E0B', '#6B7280'];

export default function ChannelChart({ data }: { data: ChannelData[] }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <h3 className="text-sm font-extrabold mb-3">📡 채널별 유입</h3>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={item.channel} className="flex items-center gap-2">
            <span className="w-24 text-xs text-gray-600 truncate">{item.channel}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(item.percentage, 3)}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                }}
              />
            </div>
            <span className="w-10 text-xs font-medium text-right">{item.sessions}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
