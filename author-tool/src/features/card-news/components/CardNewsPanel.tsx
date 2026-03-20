import { useState, useCallback } from 'react';
import { useCardNewsExams, useCardNewsQuestions, useCardNewsModels } from '../hooks/useCardNews';
import { cardNewsApi, type CardNewsSlideResult, type QuestionData } from '../api/card-news.api';
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

export function CardNewsPanel() {
  const { data: exams } = useCardNewsExams();
  const { data: models } = useCardNewsModels();

  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const { data: questions } = useCardNewsQuestions(selectedExam);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [eraFilter, setEraFilter] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [ctaText, setCtaText] = useState('더 많은 기출문제를\n풀어보고 싶다면?');
  const [ctaUrl, setCtaUrl] = useState('gcnote.co.kr');
  // explanation is always AI-summarized from existing data

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<CardNewsSlideResult[]>([]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [previewSlide, setPreviewSlide] = useState(0);

  const filteredQuestions = questions?.filter((q) => !eraFilter || q.era === eraFilter) || [];
  const eras = [...new Set(questions?.map((q) => q.era) || [])];

  const toggleQuestion = (qn: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qn)) next.delete(qn);
      else next.add(qn);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredQuestions.map((q) => q.questionNumber)));
  };

  const clearAll = () => setSelectedIds(new Set());

  const selectRandom = (n: number) => {
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    setSelectedIds(new Set(shuffled.slice(0, n).map((q) => q.questionNumber)));
  };

  const handleGenerate = useCallback(async () => {
    if (!questions || selectedIds.size === 0) return;
    const selected = questions.filter((q) => selectedIds.has(q.questionNumber));

    setGenerating(true);
    setProgress('AI 생성 중... (문제당 10~30초 소요)');
    setError('');
    setResults([]);

    try {
      const res = await fetch('/api/card-news/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: selected, ctaText, ctaUrl, model: model || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
        setProgress('완료!');
      } else {
        setError(json.error || '생성 실패');
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류');
    } finally {
      setGenerating(false);
    }
  }, [questions, selectedIds, ctaText, ctaUrl, model]);

  const handleDownloadAll = () => {
    if (!questions || selectedIds.size === 0) return;
    const selected = questions.filter((q) => selectedIds.has(q.questionNumber));
    cardNewsApi.downloadZip({ questions: selected, ctaText, ctaUrl, model: model || undefined });
  };

  const downloadSingleSlide = (result: CardNewsSlideResult, slideIdx: number) => {
    const names = ['hook', 'question', 'answer', 'cta'];
    const b64 = result.slides[slideIdx];
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${b64}`;
    a.download = `exam${result.examNumber}-Q${result.questionNumber}-${names[slideIdx]}.png`;
    a.click();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">📸 카드뉴스 생성</h2>
      <p className="text-sm text-gray-500 mb-6">기출문제 → AI 해설 → 4장 캐러셀 → PNG 다운로드</p>

      {/* Exam selector */}
      <div className="rounded-xl border bg-white p-5 mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">시험 선택</h3>
        <select
          value={selectedExam ?? ''}
          onChange={(e) => { setSelectedExam(e.target.value ? Number(e.target.value) : null); setSelectedIds(new Set()); }}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">시험을 선택하세요</option>
          {exams?.map((e) => (
            <option key={e.examNumber} value={e.examNumber}>
              제{e.examNumber}회 ({e.questionCount}문제)
            </option>
          ))}
        </select>
      </div>

      {/* Question selector */}
      {questions && questions.length > 0 && (
        <div className="rounded-xl border bg-white p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">문제 선택</h3>
            <div className="flex items-center gap-2">
              <select
                value={eraFilter}
                onChange={(e) => setEraFilter(e.target.value)}
                className="rounded-lg border px-2 py-1 text-xs"
              >
                <option value="">전체 시대</option>
                {eras.map((era) => <option key={era} value={era}>{era}</option>)}
              </select>
              <button onClick={() => selectRandom(5)} className="rounded-lg bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100">랜덤 5개</button>
              <button onClick={selectAll} className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200">전체 선택</button>
              <button onClick={clearAll} className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200">해제</button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredQuestions.map((q) => (
              <label
                key={q.questionNumber}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  selectedIds.has(q.questionNumber) ? 'bg-primary-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(q.questionNumber)}
                  onChange={() => toggleQuestion(q.questionNumber)}
                  className="rounded border-gray-300 text-primary-600"
                />
                <span className="text-sm font-medium text-gray-700 w-8">Q{q.questionNumber}</span>
                <span className="text-xs text-gray-500 flex-1 truncate">{q.content}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs ${ERA_COLORS[q.era] || 'bg-gray-100 text-gray-600'}`}>
                  {q.era}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-3 text-xs text-gray-500">
            선택: <span className="font-bold text-primary-600">{selectedIds.size}</span>문제
          </div>
        </div>
      )}

      {/* Options */}
      {selectedIds.size > 0 && (
        <div className="rounded-xl border bg-white p-5 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">생성 옵션</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">AI 모델</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border px-2 py-1.5 text-sm"
              >
                <option value="">기본 (Flash)</option>
                {models?.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">CTA URL</label>
              <input
                type="text"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">CTA 문구</label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full rounded-lg border px-2 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500">💡 기존 해설 데이터를 AI가 카드뉴스용으로 요약합니다.</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={handleGenerate} loading={generating} className="flex-1">
              🚀 카드뉴스 생성 ({selectedIds.size}문제)
            </Button>
          </div>
        </div>
      )}

      {/* Progress */}
      {(generating || progress) && (
        <div className="rounded-xl border bg-white p-5 mb-4">
          <div className="flex items-center gap-3">
            {generating && <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />}
            <span className="text-sm text-gray-700">{progress}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 mb-4">
          <div className="text-sm text-red-700 font-medium">오류 발생</div>
          <div className="text-xs text-red-600 mt-1">{error}</div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-xl border bg-white p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700">생성 완료! ({results.length}세트)</h3>
            <Button size="sm" onClick={handleDownloadAll}>📦 전체 ZIP 다운로드</Button>
          </div>

          <div className="space-y-4">
            {results.map((r, idx) => (
              <div key={idx} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold">제{r.examNumber}회 Q{r.questionNumber}</span>
                </div>
                <div className="flex gap-2">
                  {r.slides.map((b64, si) => (
                    <div
                      key={si}
                      className="relative cursor-pointer rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary-400 transition-all"
                      style={{ width: '120px', height: '120px' }}
                      onClick={() => { setPreviewIdx(idx); setPreviewSlide(si); }}
                    >
                      <img
                        src={`data:image/png;base64,${b64}`}
                        alt={`slide-${si + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-black/40 text-white text-xs rounded px-1">
                        {si + 1}
                      </div>
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
              <span className="text-sm font-bold">
                제{results[previewIdx].examNumber}회 Q{results[previewIdx].questionNumber} — 슬라이드 {previewSlide + 1}/4
              </span>
              <button onClick={() => setPreviewIdx(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <img
              src={`data:image/png;base64,${results[previewIdx].slides[previewSlide]}`}
              alt="preview"
              className="w-full rounded-lg"
            />
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
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
                onClick={() => downloadSingleSlide(results[previewIdx!], previewSlide)}
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700"
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
