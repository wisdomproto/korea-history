import type { BlogCard, ChannelType } from '../../../../lib/content-types';

interface BlogCardEditorProps {
  card: BlogCard;
  idx: number;
  dragOver: number | null;
  imageStyle: string;
  imageModelId: string;
  contentId: string;
  genImagePending: boolean;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  onDrop: (idx: number) => void;
  onUpdateCard: (cardId: string, updates: Partial<BlogCard>) => void;
  onDeleteCard: (cardId: string) => void;
  onGenerateImage: (params: { contentId: string; channel: ChannelType; targetId: string; imagePrompt: string; modelId: string }) => void;
}

export function BlogCardEditor({
  card,
  idx,
  dragOver,
  imageStyle,
  imageModelId,
  contentId,
  genImagePending,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onUpdateCard,
  onDeleteCard,
  onGenerateImage,
}: BlogCardEditorProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(idx)}
      onDragOver={(e) => onDragOver(e, idx)}
      onDragEnd={onDragEnd}
      onDrop={() => onDrop(idx)}
      className={`border border-gray-200 rounded-lg mb-2 overflow-hidden transition-all ${dragOver === idx ? 'border-t-2 border-t-blue-400' : ''}`}
    >
      <div className="px-3 py-2 bg-gray-50 flex items-center gap-2 border-b border-gray-100">
        <span className="cursor-grab text-gray-300 hover:text-gray-500 text-xs select-none">&#x2807;</span>
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100">카드 {idx + 1}</span>
        <span className="text-[10px] text-gray-400 ml-auto">
          {card.type}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteCard(card.id); }}
          className="text-gray-300 hover:text-red-500 transition-colors"
          title="카드 삭제"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {card.type === 'divider' ? (
        <div className="p-3">
          <hr className="border-gray-200" />
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {/* Image section */}
          <div className="flex items-center gap-3">
            {card.imageUrl ? (
              <img src={card.imageUrl} alt="" className="w-[160px] h-[90px] object-cover rounded" />
            ) : (
              <div className="w-[160px] h-[90px] bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400">
                이미지 없음
              </div>
            )}
            <div className="flex-1 space-y-1">
              <input
                className="w-full px-2 py-1 border border-gray-200 rounded text-[10px] text-gray-500"
                placeholder="이미지 프롬프트 (영어)"
                value={card.imagePrompt || ''}
                onChange={(e) => onUpdateCard(card.id, { imagePrompt: e.target.value })}
              />
              <button
                className="px-2 py-1 bg-pink-500 text-white rounded text-[10px] hover:bg-pink-600 disabled:opacity-50"
                disabled={genImagePending || !card.imagePrompt}
                onClick={() => onGenerateImage({ contentId, channel: 'blog', targetId: card.id, imagePrompt: `${card.imagePrompt}. Style: ${imageStyle}`, modelId: imageModelId })}
              >
                {genImagePending ? '⏳' : '🎨 이미지 생성'}
              </button>
            </div>
          </div>
          {/* Text section */}
          <textarea
            className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-blue-200"
            placeholder="텍스트 내용..."
            value={card.content}
            onChange={(e) => onUpdateCard(card.id, { content: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
