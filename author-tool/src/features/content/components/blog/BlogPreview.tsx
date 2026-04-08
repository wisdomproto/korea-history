import type { BlogContent } from '../../../../lib/content-types';

interface BlogPreviewProps {
  current: BlogContent;
  onClose: () => void;
}

export function BlogPreview({ current, onClose }: BlogPreviewProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl w-[600px] max-h-[80vh] overflow-y-auto p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">{current.title}</h2>
        <div className="prose prose-sm max-w-none">
          {current.cards.map((card) => (
            <div key={card.id}>
              {card.type === 'text' && <p>{card.content}</p>}
              {card.type === 'quote' && <blockquote className="border-l-4 border-gray-300 pl-4 italic">{card.content}</blockquote>}
              {card.type === 'list' && (
                <ul>{card.content.split('\n').map((l, i) => <li key={i}>{l.replace(/^-\s*/, '')}</li>)}</ul>
              )}
              {card.type === 'image' && card.imageUrl && <img src={card.imageUrl} alt="" className="rounded-lg" />}
              {card.type === 'divider' && <hr />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
