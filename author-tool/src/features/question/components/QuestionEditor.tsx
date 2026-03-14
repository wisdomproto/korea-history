import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { MetadataSelector } from './MetadataSelector';
import { imageApi } from '../api/image.api';
import { generatorApi } from '@/features/generator/api/generator.api';
import { ImageCropModal } from './ImageCropModal';
import type { Question, Era, Category, ModelsResponse, GeneratedQuestion } from '@/lib/types';

interface QuestionEditorProps {
  question: Question;
  examId: number;
  onSave: (data: Partial<Question>, questionId?: number) => void;
  saving?: boolean;
}

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'];

export function QuestionEditor({ question, examId, onSave, saving }: QuestionEditorProps) {
  const [content, setContent] = useState(question.content);
  const [choices, setChoices] = useState<[string, string, string, string, string]>(question.choices);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer);
  const [era, setEra] = useState<Era>(question.era);
  const [category, setCategory] = useState<Category>(question.category);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(question.difficulty);
  const [points, setPoints] = useState(question.points);
  const [imageUrl, setImageUrl] = useState(question.imageUrl ?? '');
  const [choiceImages, setChoiceImages] = useState<(string | null)[]>(question.choiceImages ?? [null, null, null, null, null]);
  const [imageModel, setImageModel] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [showImageGen, setShowImageGen] = useState(false);
  const [explanation, setExplanation] = useState(question.explanation ?? '');
  const [showAIGen, setShowAIGen] = useState(false);
  const [textModel, setTextModel] = useState('');
  const [aiTopic, setAiTopic] = useState('');

  const dropRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const dirtyRef = useRef(false);

  // Load models
  const { data: models } = useQuery<ModelsResponse>({
    queryKey: ['models'],
    queryFn: () => imageApi.getModels(),
  });

  // Cancel any pending auto-save
  const cancelAutoSave = () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = undefined; }
  };

  // Build save payload from current state
  const buildPayload = useCallback(() => {
    const hasChoiceImages = choiceImages.some(ci => ci);
    return {
      content, imageUrl: imageUrl || undefined,
      choiceImages: hasChoiceImages ? choiceImages : undefined,
      choices, correctAnswer, era, category, difficulty, points,
      explanation: explanation || undefined,
    };
  }, [content, imageUrl, choiceImages, choices, correctAnswer, era, category, difficulty, points, explanation]);

  // Flush pending save immediately (used when switching questions)
  const flushRef = useRef(buildPayload);
  flushRef.current = buildPayload;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const flushSave = useCallback(() => {
    cancelAutoSave();
    if (dirtyRef.current) {
      dirtyRef.current = false;
      onSaveRef.current(flushRef.current());
    }
  }, []);

  // Schedule auto-save (only when dirty)
  const scheduleSave = useCallback(() => {
    if (!dirtyRef.current) return;
    cancelAutoSave();
    saveTimer.current = setTimeout(() => {
      dirtyRef.current = false;
      onSave(buildPayload());
    }, 800);
  }, [buildPayload, onSave]);

  // Trigger save check whenever fields change
  useEffect(() => { scheduleSave(); return cancelAutoSave; }, [scheduleSave]);

  // Mark dirty helper — call from all user-initiated onChange handlers
  const markDirty = useCallback(() => { dirtyRef.current = true; }, []);

  // Flush pending save & reset all fields when switching to a different question
  useEffect(() => {
    // flushSave uses refs, so it captures the PREVIOUS question's state correctly
    flushSave();
    dirtyRef.current = false;
    setContent(question.content);
    setChoices(question.choices);
    setCorrectAnswer(question.correctAnswer);
    setEra(question.era);
    setCategory(question.category);
    setDifficulty(question.difficulty);
    setPoints(question.points);
    setImageUrl(question.imageUrl ?? '');
    setChoiceImages(question.choiceImages ?? [null, null, null, null, null]);
    setExplanation(question.explanation ?? '');
  }, [question.id]);

  // Sync fields from external changes (bulk update) — no dirtyRef, just sync state
  useEffect(() => { cancelAutoSave(); setCorrectAnswer(question.correctAnswer); }, [question.correctAnswer]);
  useEffect(() => { cancelAutoSave(); setPoints(question.points); }, [question.points]);
  useEffect(() => { cancelAutoSave(); setExplanation(question.explanation ?? ''); }, [question.explanation]);

  // Image upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => imageApi.upload(file),
    onSuccess: (url) => { markDirty(); setImageUrl(url); },
  });

  // Choice image upload
  const uploadChoiceImage = async (file: File, index: number) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const url = await imageApi.upload(file);
      const newChoiceImages = [...choiceImages];
      newChoiceImages[index] = url;
      setChoiceImages(newChoiceImages);
      // Save immediately (don't rely on auto-save which may miss if question switches)
      dirtyRef.current = false;
      cancelAutoSave();
      onSaveRef.current({ ...buildPayload(), choiceImages: newChoiceImages }, question.id);
    } catch { /* ignore */ }
  };

  const removeChoiceImage = (index: number) => {
    markDirty();
    setChoiceImages(prev => { const next = [...prev]; next[index] = null; return next; });
  };

  // Image generate mutation
  const imageGenMutation = useMutation({
    mutationFn: () => imageApi.generate(imagePrompt, imageModel || undefined),
    onSuccess: (data) => { markDirty(); setImageUrl(data.url); setShowImageGen(false); },
  });

  // AI question generate mutation
  const aiGenMutation = useMutation({
    mutationFn: () => generatorApi.generate({
      era, category, difficulty, points, count: 1, topic: aiTopic || undefined, model: textModel || undefined,
    }),
    onSuccess: (data: GeneratedQuestion[]) => {
      if (data.length > 0) {
        const q = data[0];
        markDirty();
        setContent(q.content);
        setChoices(q.choices);
        setCorrectAnswer(q.correctAnswer);
        setShowAIGen(false);
      }
    },
  });

  const explanationMutation = useMutation({
    mutationFn: (req: { content: string; choices: [string, string, string, string, string]; correctAnswer: number; era: string; category: string }) =>
      generatorApi.generateExplanation(req),
    onSuccess: (data: string) => {
      markDirty();
      setExplanation(data);
    },
  });

  // Active paste target: null = none, 'main' = main image, 0-4 = choice index
  const [pasteTarget, setPasteTarget] = useState<'main' | number | null>(null);

  // Handle file drop/paste
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChoiceDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) uploadChoiceImage(file, index);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        // Determine effective target: explicit pasteTarget, or auto-detect
        let target: number | 'main' | null = pasteTarget;
        if (target == null) {
          if (!imageUrl) {
            target = 'main';
          } else {
            // Auto-detect first empty choice slot
            const emptyIdx = choiceImages.findIndex((img) => !img);
            if (emptyIdx !== -1) target = emptyIdx;
          }
        }
        if (target == null) return; // No target — let browser handle paste normally
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        if (typeof target === 'number') {
          uploadChoiceImage(file, target);
        } else if (target === 'main') {
          handleFile(file);
        }
        setPasteTarget(null);
        return;
      }
    }
  }, [pasteTarget, imageUrl, choiceImages]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const updateChoice = (index: number, value: string) => {
    markDirty();
    const next = [...choices] as [string, string, string, string, string];
    next[index] = value;
    setChoices(next);
  };

  const handleMetaChange = (field: string, value: string | number) => {
    markDirty();
    if (field === 'era') setEra(value as Era);
    else if (field === 'category') setCategory(value as Category);
    else if (field === 'difficulty') setDifficulty(value as 1 | 2 | 3);
    else if (field === 'points') setPoints(value as number);
  };

  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [showCropModal, setShowCropModal] = useState(false);

  // Build current question state for preview
  const previewQuestion: Question = {
    ...question,
    content, imageUrl: imageUrl || undefined,
    choiceImages: choiceImages.some(ci => ci) ? choiceImages : undefined,
    choices, correctAnswer, era, category, difficulty, points,
    explanation: explanation || undefined,
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">문제 #{question.questionNumber}</h2>
          <div className="flex rounded-lg border bg-gray-100 p-0.5">
            <button
              onClick={() => setTab('edit')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                tab === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >편집</button>
            <button
              onClick={() => setTab('preview')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                tab === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >미리보기</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'edit' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setShowAIGen(!showAIGen)}>
                AI 문제 생성
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  cancelAutoSave();
                  dirtyRef.current = false;
                  onSave(buildPayload());
                }}
                disabled={saving}
                loading={saving}
              >
                {saving ? '저장 중...' : '💾 저장'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* === PREVIEW TAB === */}
      {tab === 'preview' && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b bg-gray-50 px-5 py-3 rounded-t-xl">
            <h3 className="text-sm font-semibold text-gray-500">앱 미리보기</h3>
          </div>
          <div className="p-5">
            <div className="mx-auto max-w-lg rounded-2xl bg-white border shadow-lg p-5 space-y-4">
              {/* Question number & metadata */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary-600">Q{previewQuestion.questionNumber}</span>
                <div className="flex gap-1.5 text-[10px]">
                  <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">{previewQuestion.era}</span>
                  <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5">{previewQuestion.category}</span>
                  <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">{previewQuestion.points}점</span>
                </div>
              </div>

              {/* 자료 이미지 */}
              {previewQuestion.imageUrl && (
                <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3">
                  <img src={previewQuestion.imageUrl} alt="" className="w-full rounded-lg border object-contain bg-gray-50" />
                </div>
              )}

              {/* Content */}
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{previewQuestion.content}</p>

              {/* Choices */}
              <div className="space-y-2">
                {previewQuestion.choices.map((c, i) => {
                  const cImg = previewQuestion.choiceImages?.[i];
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                        previewQuestion.correctAnswer === i + 1
                          ? 'border-green-400 bg-green-50 font-medium text-green-800'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="shrink-0 font-mono text-xs mt-0.5">{CHOICE_LABELS[i]}</span>
                      <div className="flex-1 space-y-1">
                        {c && <span>{c}</span>}
                        {cImg && <img src={cImg} alt="" className="w-full max-h-28 rounded border object-contain bg-gray-50" />}
                      </div>
                    </div>
                  );
                })}
              {/* Explanation */}
              {previewQuestion.explanation && (
                <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-3 text-sm text-blue-800">
                  <p className="font-semibold text-xs mb-1 text-blue-600">해설</p>
                  <p className="whitespace-pre-wrap">{previewQuestion.explanation}</p>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === EDIT TAB === */}
      {tab === 'edit' && (
        <>
          {/* AI Question Generation Panel */}
          {showAIGen && (
            <div className="rounded-lg border-2 border-violet-200 bg-violet-50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-violet-800">AI로 문제 내용 생성</h3>
              <p className="text-xs text-violet-600">현재 설정된 시대/분야/난이도에 맞는 문제를 AI가 생성합니다.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">AI 모델</label>
                  <select
                    value={textModel}
                    onChange={(e) => setTextModel(e.target.value)}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  >
                    {(models?.textModels ?? []).map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">주제/키워드 (선택)</label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                    placeholder="예: 광개토대왕"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => aiGenMutation.mutate()} loading={aiGenMutation.isPending}>
                  생성하기
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAIGen(false)}>닫기</Button>
              </div>
              {aiGenMutation.isError && <p className="text-xs text-red-500">{aiGenMutation.error.message}</p>}
            </div>
          )}

          {/* Metadata */}
          <MetadataSelector era={era} category={category} difficulty={difficulty} points={points} onChange={handleMetaChange} />

          {/* Content */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">문제 내용</label>
            <textarea
              value={content}
              onChange={(e) => { markDirty(); setContent(e.target.value); }}
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
              placeholder="(가) 인물/사건에 대한 설명으로 옳은 것은?"
            />
          </div>

          {/* Image Section */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">이미지 <span className="font-normal text-gray-400">(드래그 또는 Ctrl+V)</span></label>
              <Button size="sm" variant="ghost" onClick={() => setShowImageGen(!showImageGen)}>AI 이미지 생성</Button>
            </div>

            {/* AI Image Generation */}
            {showImageGen && (
              <div className="mb-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      placeholder="이미지 설명 (예: 고려 청자 사진)"
                    />
                  </div>
                  <select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    {(models?.imageModels ?? []).map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <Button size="sm" onClick={() => imageGenMutation.mutate()} loading={imageGenMutation.isPending} disabled={!imagePrompt.trim()}>
                  생성
                </Button>
                {imageGenMutation.isError && <p className="text-xs text-red-500">{imageGenMutation.error.message}</p>}
              </div>
            )}

            {/* Drop zone / Image preview */}
            <div
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50'); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50'); }}
              onDrop={(e) => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50'); handleDrop(e); }}
              className={`rounded-lg border-2 border-dashed transition-all ${
                imageUrl
                  ? 'border-gray-200'
                  : pasteTarget === 'main'
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
              } ${uploadMutation.isPending ? 'opacity-50' : ''}`}
            >
              {imageUrl ? (
                <div className="relative group">
                  <img src={imageUrl} alt="문제 이미지" className="max-h-[600px] w-full rounded-lg object-contain bg-gray-50 p-2" />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setShowCropModal(true)}
                      className="rounded-full bg-blue-500 text-white w-7 h-7 text-sm flex items-center justify-center"
                      title="이미지 자르기"
                    >✂</button>
                    <button
                      onClick={() => { markDirty(); setImageUrl(''); }}
                      className="rounded-full bg-red-500 text-white w-7 h-7 text-sm flex items-center justify-center"
                      title="이미지 삭제"
                    >&times;</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setPasteTarget(pasteTarget === 'main' ? null : 'main')}
                  className="flex cursor-pointer flex-col items-center gap-1 py-6 text-gray-400"
                >
                  {pasteTarget === 'main' ? (
                    <span className="text-xs font-medium text-blue-600 animate-pulse">📋 Ctrl+V로 이미지를 붙여넣으세요</span>
                  ) : (
                    <>
                      <span className="text-xs">🖼️ 클릭하여 붙여넣기 활성화 / 드래그 / </span>
                      <label className="text-xs text-blue-500 hover:underline cursor-pointer">
                        파일 선택
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Choices */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">선지 (5개)</label>
            <div className="space-y-3">
              {choices.map((choice, i) => {
                const isActive = pasteTarget === i;
                return (
                  <div
                    key={i}
                    className={`rounded-lg border-2 p-2.5 transition-colors ${
                      isActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50'); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50'); }}
                    onDrop={(e) => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50'); handleChoiceDrop(e, i); }}
                  >
                    {/* Text row */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { markDirty(); setCorrectAnswer(i + 1); }}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                          correctAnswer === i + 1
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 text-gray-400 hover:border-green-400'
                        }`}
                      >
                        {CHOICE_LABELS[i]}
                      </button>
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) => updateChoice(i, e.target.value)}
                        className={`flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none ${
                          correctAnswer === i + 1 ? 'border-green-300 bg-green-50' : 'focus:border-primary-500'
                        }`}
                        placeholder={`선지 ${i + 1}`}
                      />
                    </div>

                    {/* Image zone */}
                    <div className="mt-2 ml-9">
                      {choiceImages[i] ? (
                        <div className="relative group">
                          <img src={choiceImages[i]!} alt="" className="max-h-36 rounded-lg border object-contain bg-gray-50 w-full" />
                          <button
                            onClick={() => removeChoiceImage(i)}
                            className="absolute top-1 right-1 rounded-full bg-red-500 text-white w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >&times;</button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setPasteTarget(isActive ? null : i)}
                          className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                            isActive
                              ? 'border-blue-400 bg-blue-100 py-6'
                              : 'border-gray-300 hover:border-gray-400 py-3'
                          }`}
                        >
                          {isActive ? (
                            <span className="text-xs font-medium text-blue-600 animate-pulse">📋 Ctrl+V로 이미지를 붙여넣으세요</span>
                          ) : (
                            <>
                              <span className="text-xs text-gray-400">🖼️ 클릭하여 붙여넣기 활성화 / 드래그 / </span>
                              <label className="text-xs text-blue-500 hover:underline cursor-pointer">
                                파일 선택
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadChoiceImage(f, i); }} />
                              </label>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">녹색 원 = 정답 클릭 변경 · 이미지 영역 클릭 → Ctrl+V · 드래그앤드롭 · 파일 선택</p>
          </div>

          {/* Explanation */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">해설</label>
              <button
                type="button"
                onClick={() => {
                  if (explanationMutation.isPending) return;
                  explanationMutation.mutate({
                    content, choices, correctAnswer, era, category,
                  });
                }}
                disabled={explanationMutation.isPending || !content.trim()}
                className="flex items-center gap-1 rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {explanationMutation.isPending ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
                    생성 중...
                  </>
                ) : (
                  <>✨ AI 해설 생성</>
                )}
              </button>
            </div>
            <textarea
              value={explanation}
              onChange={(e) => { markDirty(); setExplanation(e.target.value); }}
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
              placeholder="이 문제의 해설을 입력하세요..."
            />
          </div>
        </>
      )}

      {/* Image Crop Modal */}
      {showCropModal && imageUrl && (
        <ImageCropModal
          open={showCropModal}
          imageUrl={imageUrl}
          onClose={() => setShowCropModal(false)}
          onCropped={(file) => {
            const oldUrl = imageUrl;
            const capturedQuestionId = question.id;
            const capturedPayload = buildPayload();
            uploadMutation.mutate(file, {
              onSuccess: (url) => {
                setImageUrl(url);
                setShowCropModal(false);
                // Save immediately with captured questionId + payload (survives question switch)
                dirtyRef.current = false;
                cancelAutoSave();
                onSaveRef.current({ ...capturedPayload, imageUrl: url }, capturedQuestionId);
                // Delete old image from R2
                if (oldUrl) imageApi.delete(oldUrl).catch(() => {});
              },
            });
          }}
          loading={uploadMutation.isPending}
        />
      )}
    </div>
  );
}
