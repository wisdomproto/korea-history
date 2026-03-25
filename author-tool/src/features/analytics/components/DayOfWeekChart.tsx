import type { DayOfWeekData } from '../types/analytics.types';

const DAY_COLORS: Record<string, string> = {
  '일': '#DC2626',
  '토': '#2563EB',
};

export default function DayOfWeekChart({ data }: { data: DayOfWeekData[] }) {
  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="text-sm font-extrabold mb-3">📅 요일별</div>
      <div className="flex gap-1.5 items-end justify-center h-24">
        {data.map((d) => {
          const height = Math.max((d.sessions / maxSessions) * 100, 5);
          const color = DAY_COLORS[d.name] ?? '#059669';
          return (
            <div key={d.dayOfWeek} className="text-center flex-1">
              <div
                className="mx-auto w-full max-w-[40px] rounded-t-lg flex items-end justify-center text-white text-[10px] font-bold pb-0.5"
                style={{ height: `${height}%`, backgroundColor: color }}
              >
                {d.sessions > 0 ? d.sessions : ''}
              </div>
              <div className={`text-[11px] mt-1 font-semibold ${
                d.name === '일' ? 'text-red-500' : d.name === '토' ? 'text-blue-500' : 'text-gray-500'
              }`}>
                {d.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
