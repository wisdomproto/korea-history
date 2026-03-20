import { useState, useCallback } from 'react';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { useCardNewsModels } from '../hooks/useCardNews';
import { Button } from '@/components/Button';

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

const SECTION_LABELS: Record<string, string> = {
  s1: '고대/중세 (삼국·남북국)',
  s2: '고려',
  s3: '조선 전기',
  s4: '조선 후기',
  s5: '근대',
  s6: '일제 강점기',
  s7: '현대',
};

interface NoteSlideResult {
  noteId: string;
  title: string;
  era: string;
  slides: string[];
}

export function NoteCardNewsPanel() {
  const { data: notes } = useNotes();
  const { data: models } = useCardNewsModels();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sectionFilter, setSectionFilter] = useState('');
  const [model, setModel] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [ctaUrl, setCtaUrl] = useState('gcnote.co.kr');

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<NoteSlideResult[]>([]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [previewSlide, setPreviewSlide] = useState(0);

  const sections = [...new Set(notes?.map((n) => n.sectionId) || [])].sort();
  const filtered = notes?.filter((n) => !sectionFilter || n.sectionId === sectionFilter) || [];

  const toggleNote = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((n) => n.id)));
  const clearAll = () => setSelectedIds(new Set());
  const selectRandom = (n: number) => {
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setSelectedIds(new Set(shuffled.slice(0, n).map((x) => x.id)));
  };

  const handleGenerate = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    setProgress('AI 요약 중... (노트당 10~30초 소요)');
    setResults([]);

    try {
      const res = await fetch('/api/card-news/notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteIds: [...selectedIds], slideCount, model: model || undefined, ctaUrl }),
      });
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
        setProgress('완료!');
      } else {
        setProgress(`오류: ${json.error || '생성 실패'}`);
      }
    } catch (err: any) {
      setProgress(`오류: ${err.message || '네트워크 오류'}`);
    } finally {
      setGenerating(false);
    }
  }, [selectedIds, slideCount, model, ctaUrl]);

  const downloadSlide = (result: NoteSlideResult, slideIdx: number) => {
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${result.slides[slideIdx]}`;
    a.download = `note-${result.noteId}-slide${slideIdx + 1}.png`;
    a.click();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">📝 요약노트 카드뉴스</h2>
      <p className="text-sm text-gray-500 mb-6">요약노트 → AI 핵심 추출 → 시대별 인포그래픽 → PNG</p>

      {/* Note selector */}
      <div className="rounded-xl border bg-white p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">노트 선택</h3>
          <div className="flex items-center gap-2">
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-lg border px-2 py-1 text-xs"
            >
              <option value="">전체 시대</option>
              {sections.map((s) => <option key={s} value={s}>{SECTION_LABELS[s] || s}</option>)}
            </select>
            <button onClick={() => selectRandom(3)} className="rounded-lg bg-pink-50 px-2 py-1 text-xs font-medium text-pink-700 hover:bg-pink-100">랜덤 3개</button>
            <button onClick={selectAll} className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200">전체</button>
            <button onClick={clearAll} className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200">해제</button>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1">
          {filtered.map((n) => (
            <label
              key={n.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                selectedIds.has(n.id) ? 'bg-pink-50' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(n.id)}
                onChange={() => toggleNote(n.id)}
                className="rounded border-gray-300 text-pink-600"
              />
              <span className="text-sm font-medium text-gray-700 flex-1 truncate">{n.title}</span>
              <span className={`rounded px-1.5 py-0.5 text-xs ${ERA_COLORS[n.era] || 'bg-gray-100 text-gray-600'}`}>
                {n.era}
              </span>
              <span className="text-xs text-gray-400">{n.questionCount}문제</span>
            </label>
          ))}
        </div>

        <div className="mt-3 text-xs text-gray-500">
          선택: <span className="font-bold text-pink-600">{selectedIds.size}</span>개 노트
        </div>
      </div>

      {/* Options */}
      {selectedIds.size > 0 && (
        <div className="rounded-xl border bg-white p-5 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">생성 옵션</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">AI 모델</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-lg border px-2 py-1.5 text-sm">
                <option value="">기본 (Flash)</option>
                {models?.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">슬라이드 수</label>
              <select value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))} className="w-full rounded-lg border px-2 py-1.5 text-sm">
                <option value={3}>3장 (간단)</option>
                <option value={4}>4장</option>
                <option value={5}>5장 (상세)</option>
                <option value={6}>6장 (최상세)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">CTA URL</label>
              <input type="text" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className="w-full rounded-lg border px-2 py-1.5 text-sm" />
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleGenerate} loading={generating} className="w-full">
              🚀 노트 카드뉴스 생성 ({selectedIds.size}개)
            </Button>
          </div>
        </div>
      )}

      {/* Progress */}
      {generating && (
        <div className="rounded-xl border bg-white p-5 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-200 border-t-pink-600" />
            <span className="text-sm text-gray-700">{progress}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">생성 완료! ({results.length}세트)</h3>

          <div className="space-y-4">
            {results.map((r, idx) => (
              <div key={idx} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${ERA_COLORS[r.era] || 'bg-gray-100'}`}>{r.era}</span>
                  <span className="text-sm font-bold">{r.title}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {r.slides.map((b64, si) => (
                    <div
                      key={si}
                      className="relative cursor-pointer rounded-lg overflow-hidden border hover:ring-2 hover:ring-pink-400 transition-all shrink-0"
                      style={{ width: '100px', height: '100px' }}
                      onClick={() => { setPreviewIdx(idx); setPreviewSlide(si); }}
                    >
                      <img src={`data:image/png;base64,${b64}`} alt={`slide-${si + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-black/40 text-white text-xs rounded px-1">{si + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewIdx !== null && results[previewIdx] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewIdx(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold">{results[previewIdx].title} — {previewSlide + 1}/{results[previewIdx].slides.length}</span>
              <button onClick={() => setPreviewIdx(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <img src={`data:image/png;base64,${results[previewIdx].slides[previewSlide]}`} alt="preview" className="w-full rounded-lg" />
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                {results[previewIdx].slides.map((_, i) => (
                  <button
                    key={i} onClick={() => setPreviewSlide(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                      previewSlide === i ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >{i + 1}</button>
                ))}
              </div>
              <button
                onClick={() => downloadSlide(results[previewIdx!], previewSlide)}
                className="rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-pink-700"
              >
                📥 PNG 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
