import type { DeviceData } from '../types/analytics.types';

const DEVICE_LABELS: Record<string, string> = {
  mobile: '모바일',
  desktop: '데스크톱',
  tablet: '태블릿',
};

const DEVICE_COLORS: Record<string, string> = {
  mobile: '#059669',
  desktop: '#2563EB',
  tablet: '#9CA3AF',
};

export default function DeviceChart({ data }: { data: DeviceData[] }) {
  const maxPct = Math.max(...data.map((d) => d.percentage), 1);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <h3 className="text-sm font-extrabold mb-3">📱 디바이스</h3>
      <div className="flex items-end justify-center gap-6 h-36">
        {data.map((d) => {
          const heightPct = (d.percentage / maxPct) * 100;
          const color = DEVICE_COLORS[d.device] || '#6B7280';
          const label = DEVICE_LABELS[d.device] || d.device;
          return (
            <div key={d.device} className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                <div
                  className="w-12 rounded-t-md flex items-center justify-center"
                  style={{
                    height: `${Math.max(heightPct, 8)}%`,
                    backgroundColor: color,
                  }}
                >
                  <span className="text-white text-xs font-bold">{d.percentage.toFixed(0)}%</span>
                </div>
              </div>
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
