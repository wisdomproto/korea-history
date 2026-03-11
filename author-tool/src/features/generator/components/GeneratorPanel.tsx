import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { MetadataSelector } from '@/features/question/components/MetadataSelector';
import { useGenerateQuestions } from '../hooks/useGenerator';
import { useAddBatchQuestions } from '@/features/question/hooks/useQuestions';
import { useEditorStore } from '@/store/editor.store';
import { imageApi } from '@/features/question/api/image.api';
import type { Era, Category, GeneratedQuestion, ModelsResponse } from '@/lib/types';

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'];

export function GeneratorPanel() {
  const { selectedExamId, setActiveView, setSelectedExamId } = useEditorStore();

  const [era, setEra] = useState<Era>('삼국');
  const [category, setCategory] = useState<Category>('정치');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [points, setPoints] = useState(2);
  const [count, setCount] = useState(5);
  const [topic, setTopic] = useState('');
  const [model, setModel] = useState('');
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: models } = useQuery<ModelsResponse>({
    queryKey: ['models'],
    queryFn: () => imageApi.getModels(),
  });

  const generateMutation = useGenerateQuestions();
  const addBatchMutation = useAddBatchQuestions();

  const handleMetaChange = (field: string, value: string | number) => {
    if (field === 'era') setEra(value as Era);
    else if (field === 'category') setCategory(value as Category);
    else if (field === 'difficulty') setDifficulty(value as 1 | 2 | 3);
    else if (field === 'points') setPoints(value as number);
  };

  const handleGenerate = () => {
    generateMutation.mutate({ era, category, difficulty, points, count, topic: topic || undefined, model: model || undefined }, {
      onSuccess: (data) => {
        setGenerated(data);
        setSelected(new Set(data.map((_, i) => i)));
      },
    });
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleSave = () => {
    if (!selectedExamId) {
      alert('먼저 사이드바에서 시험을 선택하세요.');
      return;
    }
    const toSave = generated.filter((_, i) => selected.has(i));
    addBatchMutation.mutate({ examId: selectedExamId, questions: toSave }, {
      onSuccess: () => {
        setGenerated([]);
        setSelected(new Set());
        setActiveView('exam');
      },
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">AI 문제 생성</h2>

      {/* Settings */}
      <div className="rounded-xl border bg-white p-5">
        <MetadataSelector era={era} category={category} difficulty={difficulty} points={points} onChange={handleMetaChange} />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">AI 모델</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              {(models?.textModels ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">생성 개수</label>
            <select
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              {[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n}개</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">주제/키워드 (선택)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              placeholder="예: 광개토대왕, 임진왜란"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleGenerate} loading={generateMutation.isPending} className="w-full">
            문제 생성하기
          </Button>
          {generateMutation.isError && (
            <p className="mt-2 text-sm text-red-500">{generateMutation.error.message}</p>
          )}
        </div>
      </div>

      {/* Generated Results */}
      {generated.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">생성 결과 ({generated.length}개)</h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelected(new Set(generated.map((_, i) => i)))}>
                전체 선택
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                loading={addBatchMutation.isPending}
                disabled={selected.size === 0}
              >
                선택한 {selected.size}개 저장
              </Button>
            </div>
          </div>

          {generated.map((q, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 transition-colors ${
                selected.has(idx) ? 'border-primary-300 bg-primary-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => toggleSelect(idx)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 text-xs mb-2">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5">{q.era}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5">{q.category}</span>
                    <span className="text-gray-400">난이도 {q.difficulty} / {q.points}점</span>
                  </div>
                  <p className="mb-2 text-sm whitespace-pre-wrap">{q.content}</p>
                  <div className="space-y-1">
                    {q.choices.map((c, i) => (
                      <div
                        key={i}
                        className={`text-xs px-2 py-1 rounded ${
                          q.correctAnswer === i + 1 ? 'bg-green-100 text-green-800 font-medium' : 'text-gray-600'
                        }`}
                      >
                        {CHOICE_LABELS[i]} {c}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
