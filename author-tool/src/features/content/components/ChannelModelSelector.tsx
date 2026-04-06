// author-tool/src/features/content/components/ChannelModelSelector.tsx
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../lib/axios';
import type { ModelsResponse } from '../../../lib/types';

interface Props {
  type: 'text' | 'image';
  value: string;
  onChange: (modelId: string) => void;
  label?: string;
}

export function ChannelModelSelector({ type, value, onChange, label }: Props) {
  const { data: models } = useQuery<ModelsResponse>({
    queryKey: ['models'],
    queryFn: () => apiGet<ModelsResponse>('/card-news/models'),
    staleTime: Infinity,
  });

  const raw = models as any;
  const list = type === 'text' ? (raw?.textModels || raw?.text) : (raw?.imageModels || raw?.image);
  if (!list) return null;

  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[10px] text-gray-400">{label}</span>}
      <select
        className="px-2 py-1 border border-gray-200 rounded text-[11px] bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {list.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
