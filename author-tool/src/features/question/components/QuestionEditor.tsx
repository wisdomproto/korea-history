import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { MetadataSelector } from './MetadataSelector';
import { imageApi } from '../api/image.api';
import { generatorApi } from '@/features/generator/api/generator.api';
import type { Question, Era, Category, ModelsResponse, GeneratedQuestion } from '@/lib/types';

interface QuestionEditorProps {
  question: Question;
  examId: number;
  onSave: (data: Partial<Question>) => void;
  saving?: boolean;
}

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'];

export function QuestionEditor({ question, examId, onSave, saving }: QuestionEditorProps) {
  const [content, setContent] = useState(question.content);
  const [passage, setPassage] = useState(question.passage ?? '');
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
  const [showAIGen, setShowAIGen] = useState(false);
  const [textModel, setTextModel] = useState('');
  const [aiTopic, setAiTopic] = useState('');

  const dropRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load models
  const { data: models } = useQuery<ModelsResponse>({
    queryKey: ['models'],
    queryFn: () => imageApi.getModels(),
  });

  // Auto-save on change (debounced)
  const autoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const hasChoiceImages = choiceImages.some(ci => ci);
      onSave({
        content, passage: passage || undefined, imageUrl: imageUrl || undefined,
        choiceImages: hasChoiceImages ? choiceImages : undefined,
        choices, correctAnswer, era, category, difficulty, points,
      });
    }, 800);
  }, [content, passage, imageUrl, choiceImages, choices, correctAnswer, era, category, difficulty, points, onSave]);

  useEffect(() => { autoSave(); return () => { if (saveTimer.current) clearTimeout(saveTimer.current); }; }, [autoSave]);

  // Reset when question changes
  useEffect(() => {
    setContent(question.content);
    setPassage(question.passage ?? '');
    setChoices(question.choices);
    setCorrectAnswer(question.correctAnswer);
    setEra(question.era);
    setCategory(question.category);
    setDifficulty(question.difficulty);
    setPoints(question.points);
    setImageUrl(question.imageUrl ?? '');
    setChoiceImages(question.choiceImages ?? [null, null, null, null, null]);
  }, [question.id]);

  // Image upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => imageApi.upload(file),
    onSuccess: (url) => setImageUrl(url),
  });

  // Choice image upload
  const uploadChoiceImage = async (file: File, index: number) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const url = await imageApi.upload(file);
      setChoiceImages(prev => { const next = [...prev]; next[index] = url; return next; });
    } catch { /* ignore */ }
  };

  const removeChoiceImage = (index: number) => {
    setChoiceImages(prev => { const next = [...prev]; next[index] = null; return next; });
  };

  // Image generate mutation
  const imageGenMutation = useMutation({
    mutationFn: () => imageApi.generate(imagePrompt, imageModel || undefined),
    onSuccess: (data) => { setImageUrl(data.url); setShowImageGen(false); },
  });

  // AI question generate mutation
  const aiGenMutation = useMutation({
    mutationFn: () => generatorApi.generate({
      era, category, difficulty, points, count: 1, topic: aiTopic || undefined, model: textModel || undefined,
    }),
    onSuccess: (data: GeneratedQuestion[]) => {
      if (data.length > 0) {
        const q = data[0];
        setContent(q.content);
        setPassage(q.passage ?? '');
        setChoices(q.choices);
        setCorrectAnswer(q.correctAnswer);
        setShowAIGen(false);
      }
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
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        if (typeof pasteTarget === 'number') {
          uploadChoiceImage(file, pasteTarget);
        } else if (pasteTarget === 'main') {
          handleFile(file);
        }
        setPasteTarget(null);
        return;
      }
    }
  }, [pasteTarget]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const updateChoice = (index: number, value: string) => {
    const next = [...choices] as [string, string, string, string, string];
    next[index] = value;
    setChoices(next);
  };

  const handleMetaChange = (field: string, value: string | number) => {
    if (field === 'era') setEra(value as Era);
    else if (field === 'category') setCategory(value as Category);
    else if (field === 'difficulty') setDifficulty(value as 1 | 2 | 3);
    else if (field === 'points') setPoints(value as number);
  };

  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  // Build current question state for preview
  const previewQuestion: Question = {
    ...question,
    content, passage: passage || undefined, imageUrl: imageUrl || undefined,
    choiceImages: choiceImages.some(ci => ci) ? choiceImages : undefined,
    choices, correctAnswer, era, category, difficulty, points,
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
          {saving && <span className="text-xs text-gray-400">저장 중...</span>}
          {tab === 'edit' && (
            <Button size="sm" variant="secondary" onClick={() => setShowAIGen(!showAIGen)}>
              AI 문제 생성
            </Button>
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

              {/* 자료: 지문 텍스트 and/or 이미지 */}
              {(previewQuestion.passage || previewQuestion.imageUrl) && (
                <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3 space-y-2">
                  {previewQuestion.passage && (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{previewQuestion.passage}</p>
                  )}
                  {previewQuestion.imageUrl && (
                    <img src={previewQuestion.imageUrl} alt="" className="w-full rounded-lg border object-contain bg-gray-50" />
                  )}
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
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
              placeholder="(가) 인물/사건에 대한 설명으로 옳은 것은?"
            />
          </div>

          {/* Passage */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              지문/사료 <span className="font-normal text-gray-400">(선택)</span>
            </label>
            <textarea
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
              placeholder="긴 사료나 지문이 있으면 여기에 입력..."
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
                  <button
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 rounded-full bg-red-500 text-white w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
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
                        onClick={() => setCorrectAnswer(i + 1)}
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
        </>
      )}
    </div>
  );
}
