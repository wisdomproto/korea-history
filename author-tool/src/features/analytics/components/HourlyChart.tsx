import type { HourlyData } from '../types/analytics.types';

function getBarColor(sessions: number, max: number): string {
  if (max === 0) return '#E5E7EB';
  const ratio = sessions / max;
  if (ratio > 0.7) return '#059669';
  if (ratio > 0.3) return '#BBF7D0';
  return '#E5E7EB';
}

export default function HourlyChart({ data }: { data: HourlyData[] }) {
  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);
  const peakItem = data.reduce((a, b) => (b.sessions > a.sessions ? b : a), data[0]);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <h3 className="text-sm font-extrabold mb-3">🕐 시간대별 트래픽</h3>
      <div className="flex items-end gap-px h-28">
        {data.map((d) => {
          const heightPct = maxSessions > 0 ? (d.sessions / maxSessions) * 100 : 0;
          return (
            <div
              key={d.hour}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${Math.max(heightPct, 2)}%`,
                backgroundColor: getBarColor(d.sessions, maxSessions),
              }}
              title={`${d.hour}시: ${d.sessions}세션`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
        <span>0시</span>
        <span>6시</span>
        <span>12시</span>
        <span>18시</span>
        <span>24시</span>
      </div>
      {peakItem && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          피크: {peakItem.hour}~{peakItem.hour + 1}시 ({peakItem.sessions}세션)
        </p>
      )}
    </div>
  );
}
