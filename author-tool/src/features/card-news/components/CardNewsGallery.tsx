import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete } from '@/lib/axios';
import { Button } from '@/components/Button';

interface CardNewsItem {
  id: string;
  type: 'exam' | 'note';
  title: string;
  era?: string;
  sourceId: string;
  slides: string[];
  createdAt: string;
}

const ERA_COLORS: Record<string, string> = {
  '선사·고조선': 'bg-amber-100 text-amber-800',
  '삼국': 'bg-red-100 text-red-800',
  '남북국': 'bg-orange-100 text-orange-800',
  '고려': 'bg-emerald-100 text-emerald-800',
  '조선 전기': 'bg-blue-100 text-blue-800',
  '조선 후기': 'bg-indigo-100 text-indigo-800',
  '근대': 'bg-purple-100 text-purple-800',
  '현대': 'bg-pink-100 text-pink-800',
};

export function CardNewsGallery() {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ['card-news-saved'],
    queryFn: () => apiGet<CardNewsItem[]>('/card-news/saved'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/card-news/saved/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['card-news-saved'] }),
  });

  const [previewItem, setPreviewItem] = useState<CardNewsItem | null>(null);
  const [previewSlide, setPreviewSlide] = useState(0);
  const [filter, setFilter] = useState<'all' | 'exam' | 'note'>('all');

  const filtered = items?.filter((i) => filter === 'all' || i.type === filter) || [];

  const downloadSlide = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">📂 카드뉴스 갤러리</h2>
          <p className="text-sm text-gray-500">R2에 저장된 카드뉴스 ({items?.length || 0}개)</p>
        </div>
        <div className="flex gap-1">
          {(['all', 'exam', 'note'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? '전체' : f === 'exam' ? '기출' : '노트'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400 text-sm">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-2">📂</div>
          <p className="text-sm">저장된 카드뉴스가 없습니다</p>
          <p className="text-xs mt-1">카드뉴스를 생성하면 자동으로 여기에 저장됩니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    item.type === 'exam' ? 'bg-primary-100 text-primary-700' : 'bg-pink-100 text-pink-700'
                  }`}>
                    {item.type === 'exam' ? '기출' : '노트'}
                  </span>
                  {item.era && (
                    <span className={`rounded px-1.5 py-0.5 text-xs ${ERA_COLORS[item.era] || 'bg-gray-100'}`}>
                      {item.era}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate(item.id); }}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                  title="삭제"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Title */}
              <div className="text-sm font-bold text-gray-800 mb-2">{item.title}</div>

              {/* Slide thumbnails */}
              <div className="flex gap-1.5 mb-3">
                {item.slides.map((url, si) => (
                  <div
                    key={si}
                    className="cursor-pointer rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary-400 transition-all flex-1"
                    style={{ aspectRatio: '1' }}
                    onClick={() => { setPreviewItem(item); setPreviewSlide(si); }}
                  >
                    <img src={url} alt={`slide-${si + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{new Date(item.createdAt).toLocaleDateString('ko-KR')} · {item.slides.length}장</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewItem(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold">{previewItem.title} — {previewSlide + 1}/{previewItem.slides.length}</span>
              <button onClick={() => setPreviewItem(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <img src={previewItem.slides[previewSlide]} alt="preview" className="w-full rounded-lg" />
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                {previewItem.slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewSlide(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                      previewSlide === i ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => downloadSlide(previewItem.slides[previewSlide], `${previewItem.id}-slide${previewSlide + 1}.png`)}
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700"
              >
                📥 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
