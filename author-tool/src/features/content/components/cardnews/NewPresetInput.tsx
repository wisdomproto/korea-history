import { useState } from 'react';

export function NewPresetInput({ onSave, isPending }: { onSave: (name: string) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  if (!open) {
    return (
      <button className="w-full text-[9px] text-pink-500 hover:text-pink-700 border border-dashed border-pink-300 rounded py-1 mb-1.5"
        onClick={() => setOpen(true)}>
        + 새 프리셋
      </button>
    );
  }

  return (
    <div className="flex gap-1 mb-1.5">
      <input className="flex-1 text-[9px] border rounded px-1.5 py-1" placeholder="프리셋 이름"
        value={name} autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { onSave(name.trim()); setOpen(false); setName(''); } if (e.key === 'Escape') { setOpen(false); setName(''); } }}
      />
      <button className="text-[9px] text-pink-500 hover:text-pink-700 disabled:opacity-50 px-1.5"
        disabled={!name.trim() || isPending}
        onClick={() => { onSave(name.trim()); setOpen(false); setName(''); }}>
        {isPending ? '⏳' : '저장'}
      </button>
      <button className="text-[9px] text-gray-400 hover:text-gray-600 px-1"
        onClick={() => { setOpen(false); setName(''); }}>취소</button>
    </div>
  );
}
