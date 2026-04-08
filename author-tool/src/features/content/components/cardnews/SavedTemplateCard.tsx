import { useState } from 'react';

export function SavedTemplateCard({ tmpl, isActive, onApply, onRename, onDelete }: {
  tmpl: any;
  isActive: boolean;
  onApply: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tmpl.name);
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Delete button — top right on hover */}
      {hovered && (
        <button
          className="absolute -top-1.5 -right-1.5 z-10 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center shadow hover:bg-red-600"
          onClick={(e) => { e.stopPropagation(); if (confirm(`'${tmpl.name}' 프리셋을 삭제하시겠습니까?`)) onDelete(); }}
          title="프리셋 삭제"
        >✕</button>
      )}

      {/* Preview (click to apply) */}
      <div onClick={onApply}
        className={`cursor-pointer rounded overflow-hidden border-2 transition-all ${isActive ? 'border-pink-500' : 'border-dashed border-gray-300 hover:border-gray-400'}`}>
        <div className="aspect-[4/5] flex flex-col items-center justify-center p-0.5" style={{ backgroundColor: tmpl.canvas.bgColor }}>
          <div className="text-[5px] font-bold" style={{ color: tmpl.canvas.textBlocks[0]?.color }}>제목</div>
          <div className="text-[4px] mt-0.5" style={{ color: tmpl.canvas.textBlocks[1]?.color }}>본문</div>
        </div>
      </div>

      {/* Name — click to edit */}
      {editing ? (
        <input className="w-full text-[8px] text-center py-0.5 bg-yellow-50 border rounded px-1 mt-0.5"
          value={name} autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={() => { if (name.trim() && name !== tmpl.name) onRename(name.trim()); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (name.trim() && name !== tmpl.name) onRename(name.trim()); setEditing(false); } if (e.key === 'Escape') { setName(tmpl.name); setEditing(false); } }}
        />
      ) : (
        <div className="text-[8px] text-center py-0.5 truncate px-0.5 cursor-text hover:bg-gray-100 rounded mt-0.5"
          onClick={(e) => { e.stopPropagation(); setEditing(true); setName(tmpl.name); }}
          title="클릭하여 이름 수정">{tmpl.name}</div>
      )}
    </div>
  );
}
