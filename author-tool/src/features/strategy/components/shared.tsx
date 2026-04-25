import { useState, type ReactNode } from 'react';

export function Section({
  icon, title, subtitle, onAi, aiLabel, aiPending, children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onAi?: () => void;
  aiLabel?: string;
  aiPending?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
      <header className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div>
          <h3 className="text-sm font-extrabold flex items-center gap-2">
            <span>{icon}</span>{title}
          </h3>
          {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
        </div>
        {onAi && (
          <button
            onClick={onAi}
            disabled={aiPending}
            className="rounded-lg bg-indigo-600 text-white px-2.5 py-1 text-[11px] font-bold disabled:bg-gray-300 hover:bg-indigo-700"
          >
            {aiPending ? '초안 생성 중...' : aiLabel ?? '🤖 AI 초안'}
          </button>
        )}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[11px] font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

interface ChipListProps {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function ChipList({ label, items, onChange, placeholder }: ChipListProps) {
  const [input, setInput] = useState('');
  return (
    <Field label={label}>
      <div className="rounded-lg border border-gray-200 p-2 focus-within:border-emerald-400">
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
            >
              {item}
              <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="hover:text-rose-500">
                ×
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
                e.preventDefault();
                onChange([...items, input.trim()]);
                setInput('');
              } else if (e.key === 'Backspace' && !input) {
                onChange(items.slice(0, -1));
              }
            }}
            onBlur={() => {
              if (input.trim()) {
                onChange([...items, input.trim()]);
                setInput('');
              }
            }}
            placeholder={items.length === 0 ? placeholder : '+ 추가 (Enter)'}
            className="flex-1 min-w-[140px] bg-transparent text-xs outline-none px-1"
          />
        </div>
      </div>
    </Field>
  );
}
