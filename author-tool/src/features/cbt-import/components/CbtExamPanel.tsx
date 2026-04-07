// CBT Exam Panel — split layout matching Korean History exam UI
// Left: question list, Right: question editor with auto-save
import { useState, useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useCbtExam } from '../hooks/useCbtExam';
import { useCbtExams } from '../hooks/useCbtExams';
import { GenerateModal } from '@/features/summary-notes/components/GenerateModal';
import { Button } from '@/components/Button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/lib/axios';
import { cbtApi } from '../api/cbt.api';
import type { CbtQuestion } from '../api/cbt.api';

export function CbtExamPanel() {
  const { selectedCbtExamId, selectedProjectId } = useEditorStore();
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiGet<any[]>('/projects') });
  const currentProject = projects?.find((p: any) => p.id === selectedProjectId);
  const categoryCode = currentProject?.categoryCode;

  const { data: exam, isLoading, error } = useCbtExam(categoryCode, selectedCbtExamId ?? undefined);
  const { data: allExams } = useCbtExams(categoryCode);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedQIdx, setSelectedQIdx] = useState<number | null>(null);

  if (!selectedCbtExamId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📋</div>
          <p>왼쪽에서 시험을 선택하세요</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error || !exam) {
    return <div className="flex-1 flex items-center justify-center text-red-500">시험 데이터를 로드할 수 없습니다.</div>;
  }

  const selectedQ = selectedQIdx !== null ? exam.questions[selectedQIdx] : null;

  return (
    <>
      {/* Left: Question List */}
      <div className="w-80 flex flex-col border-r bg-white shrink-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm">{exam.label}</h2>
              <p className="text-xs text-gray-500">{exam.date} · {exam.question_count}문제</p>
            </div>
            <Button size="sm" onClick={() => setShowGenerate(true)} title="요약노트 만들기">📖</Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {exam.questions.map((q, idx) => (
            <div
              key={q.question_id}
              onClick={() => setSelectedQIdx(idx)}
              className={`group flex items-center gap-2 border-b px-3 py-2 cursor-pointer transition-all text-sm ${
                selectedQIdx === idx ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
              }`}
            >
              <span className="w-6 text-center font-mono text-xs text-gray-400 shrink-0">{q.number}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-gray-800 text-xs">{q.text || '(이미지 문제)'}</p>
                <div className="flex gap-1 mt-0.5">
                  {q.answer_rate != null && (
                    <span className="text-[10px] text-gray-400">정답률 {q.answer_rate}%</span>
                  )}
                  {q.images && q.images.length > 0 && (
                    <span className="text-[10px] text-blue-400">🖼</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Question Editor */}
      <div className="flex-1 overflow-y-auto">
        {selectedQ ? (
          <CbtQuestionEditor question={selectedQ} categoryCode={categoryCode!} examId={selectedCbtExamId!} />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📝</div>
              <p>왼쪽에서 문제를 선택하세요</p>
            </div>
          </div>
        )}
      </div>

      {showGenerate && categoryCode && allExams && (
        <GenerateModal
          open={showGenerate}
          onClose={() => setShowGenerate(false)}
          categoryCode={categoryCode}
          exams={allExams}
          onComplete={(noteId) => console.log('Generated note:', noteId)}
        />
      )}
    </>
  );
}

// ─── Question Editor (right panel, auto-save + save button) ───

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'];

function CbtQuestionEditor({ question, categoryCode, examId }: { question: CbtQuestion; categoryCode: string; examId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState(question.text);
  const [correctAnswer, setCorrectAnswer] = useState(question.correct_answer);
  const [choices, setChoices] = useState(question.choices.map((c) => c.text));
  const [explanation, setExplanation] = useState(question.explanation || '');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const questionIdRef = useRef(question.question_id);

  // Build save payload
  const buildPayload = useCallback(() => ({
    text,
    correct_answer: correctAnswer,
    choices,
    explanation,
  }), [text, correctAnswer, choices, explanation]);

  const buildPayloadRef = useRef(buildPayload);
  buildPayloadRef.current = buildPayload;

  // Save to R2
  const doSave = useCallback(async (payload?: any) => {
    const data = payload || buildPayloadRef.current();
    setSaving(true);
    try {
      await cbtApi.updateQuestion(categoryCode, examId, questionIdRef.current, data);
      qc.invalidateQueries({ queryKey: ['cbt-exam', categoryCode, examId] });
      dirtyRef.current = false;
      setLastSaved(new Date().toLocaleTimeString());
    } catch (e: any) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  }, [categoryCode, examId, qc]);

  // Auto-save (800ms debounce)
  const scheduleAutoSave = useCallback(() => {
    if (!dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(), 800);
  }, [doSave]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setLastSaved(null);
  }, []);

  // Trigger auto-save on field changes
  useEffect(() => { scheduleAutoSave(); return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }; }, [text, correctAnswer, choices, explanation, scheduleAutoSave]);

  // Flush pending save + reset when switching questions
  useEffect(() => {
    if (dirtyRef.current) { doSave(buildPayloadRef.current()); }
    questionIdRef.current = question.question_id;
    dirtyRef.current = false;
    setText(question.text);
    setCorrectAnswer(question.correct_answer);
    setChoices(question.choices.map((c) => c.text));
    setExplanation(question.explanation || '');
    setLastSaved(null);
  }, [question.question_id]);

  // Manual save
  const handleSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    dirtyRef.current = true;
    doSave();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header + Save button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">문제 {question.number}</h3>
          {question.answer_rate != null && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">정답률 {question.answer_rate}%</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && <span className="text-[10px] text-gray-400">저장됨 {lastSaved}</span>}
          {saving && <span className="text-[10px] text-indigo-500">저장 중...</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-indigo-500 text-white rounded-md text-xs hover:bg-indigo-600 disabled:opacity-50"
          >
            💾 저장
          </button>
        </div>
      </div>

      {/* Question Text (지문 텍스트) */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">지문 (텍스트)</label>
        <textarea
          className="w-full border rounded-lg p-3 text-sm min-h-[80px] resize-y focus:ring-2 focus:ring-indigo-300 focus:outline-none"
          value={text}
          onChange={(e) => { markDirty(); setText(e.target.value); }}
          placeholder="문제 텍스트를 입력하세요"
        />
      </div>

      {/* Question Images (지문 이미지) */}
      {question.images && question.images.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">지문 이미지 ({question.images.length}개)</label>
          <div className="flex flex-wrap gap-3">
            {question.images.map((img, i) => (
              <img key={i} src={img.url} alt={`문제 ${question.number} 이미지 ${i + 1}`}
                className="max-h-64 rounded-lg border object-contain bg-gray-50" loading="lazy" />
            ))}
          </div>
        </div>
      )}

      {/* Choices (선지) — click to set correct, inline edit */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">선지 (클릭하여 정답 선택)</label>
        <div className="space-y-2">
          {question.choices.map((choice, idx) => (
            <div
              key={choice.number}
              onClick={() => { markDirty(); setCorrectAnswer(choice.number); }}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                correctAnswer === choice.number
                  ? 'bg-green-50 border-green-300 ring-1 ring-green-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                correctAnswer === choice.number ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {CHOICE_LABELS[idx] || choice.number}
              </span>
              <div className="flex-1">
                <input
                  className="w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-0 p-0"
                  value={choices[idx] || ''}
                  onChange={(e) => {
                    markDirty();
                    const next = [...choices];
                    next[idx] = e.target.value;
                    setChoices(next);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={`선지 ${choice.number}`}
                />
                {choice.images && choice.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {choice.images.map((img, i) => (
                      <img key={i} src={img.url} alt={`선지 ${choice.number} 이미지`}
                        className="max-h-32 rounded border object-contain bg-gray-50" loading="lazy" />
                    ))}
                  </div>
                )}
              </div>
              {correctAnswer === choice.number && (
                <span className="text-green-600 text-xs font-medium shrink-0 mt-1">✓ 정답</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Explanation (해설) */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">해설</label>
        <textarea
          className="w-full border rounded-lg p-4 text-sm min-h-[120px] resize-y bg-blue-50 text-blue-900 focus:ring-2 focus:ring-blue-300 focus:outline-none"
          value={explanation}
          onChange={(e) => { markDirty(); setExplanation(e.target.value); }}
          placeholder="해설을 입력하세요"
        />
      </div>
    </div>
  );
}
