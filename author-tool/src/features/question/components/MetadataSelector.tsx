import { ERAS, CATEGORIES, DIFFICULTIES, POINTS } from '@/lib/types';
import type { Era, Category } from '@/lib/types';

interface MetadataSelectorProps {
  era: Era;
  category: Category;
  difficulty: 1 | 2 | 3;
  points: number;
  onChange: (field: string, value: string | number) => void;
}

export function MetadataSelector({ era, category, difficulty, points, onChange }: MetadataSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">시대</label>
        <select
          value={era}
          onChange={(e) => onChange('era', e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          {ERAS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">분야</label>
        <select
          value={category}
          onChange={(e) => onChange('category', e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">난이도</label>
        <div className="flex gap-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => onChange('difficulty', d)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors ${
                difficulty === d ? 'border-primary-500 bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
              }`}
            >
              {['기초', '중급', '심화'][d - 1]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">배점</label>
        <div className="flex gap-1">
          {POINTS.map((p) => (
            <button
              key={p}
              onClick={() => onChange('points', p)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors ${
                points === p ? 'border-primary-500 bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
              }`}
            >
              {p}점
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
