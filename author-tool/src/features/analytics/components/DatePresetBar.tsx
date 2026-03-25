import { usePresets } from '../hooks/useAnalytics';
import type { DateRange } from '../types/analytics.types';

interface Props {
  selected: DateRange;
  onSelect: (range: DateRange) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function DatePresetBar({ selected, onSelect, onRefresh, isRefreshing }: Props) {
  const { data: presets } = usePresets();

  const datePresets = presets?.dates ?? [];
  const seasonPresets = presets?.seasons ?? [];

  const isActive = (start: string, end: string) =>
    selected.startDate === start && selected.endDate === end;

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-gray-200 bg-white">
      <span className="font-bold text-sm">📊 사이트 분석</span>
      <div className="flex gap-1 ml-auto">
        {datePresets.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect({ startDate: p.startDate, endDate: p.endDate })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isActive(p.startDate, p.endDate)
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {p.name}
          </button>
        ))}
        {seasonPresets.length > 0 && (
          <>
            <span className="text-gray-300 mx-1">|</span>
            {seasonPresets.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect({ startDate: s.startDate, endDate: s.endDate })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive(s.startDate, s.endDate)
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                🔥 {s.name}
              </button>
            ))}
          </>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="px-2.5 py-1.5 rounded-lg text-xs bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
      >
        {isRefreshing ? '...' : '↻'}
      </button>
    </div>
  );
}
