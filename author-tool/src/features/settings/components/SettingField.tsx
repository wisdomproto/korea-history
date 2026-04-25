import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}

export function SettingField({ label, hint, children, required }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

interface TextInputProps {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export function TextInput({ value, onChange, placeholder, maxLength }: TextInputProps) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
    />
  );
}

interface TextareaProps {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export function Textarea({ value, onChange, placeholder, rows = 4, maxLength }: TextareaProps) {
  const val = value ?? '';
  return (
    <div className="relative">
      <textarea
        value={val}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-y"
      />
      {maxLength && (
        <div className="absolute right-2 bottom-1.5 text-[10px] text-gray-400 bg-white/80 px-1 rounded">
          {val.length} / {maxLength}
        </div>
      )}
    </div>
  );
}

interface TagInputProps {
  value: string[] | undefined;
  onChange: (v: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const tags = value ?? [];
  const handleAdd = (raw: string) => {
    const next = raw
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !tags.includes(t));
    if (next.length > 0) onChange([...tags, ...next]);
  };

  return (
    <div className="rounded-lg border border-gray-200 p-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
              className="text-emerald-500 hover:text-emerald-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder={tags.length === 0 ? placeholder : '+ 추가 (Enter)'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              const v = (e.target as HTMLInputElement).value;
              if (v.trim()) {
                handleAdd(v);
                (e.target as HTMLInputElement).value = '';
              }
            } else if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={(e) => {
            if (e.target.value.trim()) {
              handleAdd(e.target.value);
              e.target.value = '';
            }
          }}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none px-1"
        />
      </div>
    </div>
  );
}
