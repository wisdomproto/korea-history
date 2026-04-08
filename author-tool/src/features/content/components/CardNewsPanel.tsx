// author-tool/src/features/content/components/CardNewsPanel.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import type { ContentFile, InstagramContent, InstagramSlide, CardCanvasData, TextBlock } from '../../../lib/content-types';
import { useSaveChannelContent, useGenerateImage, useDeleteChannelContent } from '../hooks/useContent';
import { useChannelGeneration } from '../hooks/useChannelGeneration';
import { ChannelModelSelector } from './ChannelModelSelector';
import { CARD_NEWS_TEMPLATES, DEFAULT_CANVAS, applyTemplate } from './cardnews-templates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/axios';

import { SlideCanvas } from './cardnews/SlideCanvas';
import { SlideCard } from './cardnews/SlideCard';
import { SavedTemplateCard } from './cardnews/SavedTemplateCard';
import { NewPresetInput } from './cardnews/NewPresetInput';
import { ImageStyleInput } from './cardnews/ImageStyleInput';
import { SlidePreviewModal } from './cardnews/SlidePreviewModal';
import { downloadSlide, downloadAllSlides } from './cardnews/cardnews-export';

interface Props {
  contentFile: ContentFile;
}

export function CardNewsPanel({ contentFile }: Props) {
  const { content, instagram } = contentFile;
  const current = instagram[0] as InstagramContent | undefined;
  const [textModelId, setTextModelId] = useState('gemini-2.5-flash');
  const [imageModelId, setImageModelId] = useState('gemini-2.5-flash-image');
  const [selectedSlideIdx, setSelectedSlideIdx] = useState<number | null>(null);
  const [imageStyle, setImageStyle] = useState('flat illustration');
  const [imageAspectRatio, setImageAspectRatio] = useState('4:3');
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const saveChannel = useSaveChannelContent();
  const genImage = useGenerateImage();
  const deleteCardNews = useDeleteChannelContent();
  const qc = useQueryClient();

  // ─── Saved Templates (R2) ───
  const { data: savedTemplates } = useQuery({
    queryKey: ['cardnews-templates'],
    queryFn: () => apiGet<any[]>('/cardnews-templates'),
  });
  const saveTemplateMutation = useMutation({
    mutationFn: (data: { name: string; canvas: any }) => apiPost('/cardnews-templates', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cardnews-templates'] }); },
  });
  const updateTemplateMutation = useMutation({
    mutationFn: (vars: { id: string; data: any }) => apiPut(`/cardnews-templates/${vars.id}`, vars.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardnews-templates'] }),
  });
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/cardnews-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardnews-templates'] }),
  });
  const { isGenerating, generate } = useChannelGeneration({
    contentId: content.id,
    path: 'generate/instagram',
  });

  const handleGenerate = () => generate({ modelId: textModelId });

  const buildImagePrompt = (prompt: string) =>
    `${prompt}. Style: ${imageStyle}. IMPORTANT: Do NOT include any text, letters, words, or writing in the image.`;

  // ─── Local slides state (for instant UI updates without race conditions) ───
  const [localSlides, setLocalSlides] = useState<InstagramSlide[] | null>(null);
  const slides = localSlides ?? current?.slides ?? [];
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Keyboard navigation for preview
  useEffect(() => {
    if (previewIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && previewIdx > 0) setPreviewIdx(previewIdx - 1);
      else if (e.key === 'ArrowRight' && previewIdx < slides.length - 1) setPreviewIdx(previewIdx + 1);
      else if (e.key === 'Escape') setPreviewIdx(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewIdx, slides.length]);

  // Sync local slides when server data changes (e.g. after generation, image upload)
  const serverSlidesRef = useRef(current?.slides);
  useEffect(() => {
    if (current?.slides && current.slides !== serverSlidesRef.current) {
      serverSlidesRef.current = current.slides;
      setLocalSlides(null); // reset to server data
    }
  }, [current?.slides]);

  // Save to server with debounce
  const saveCurrent = useCallback((updates: Partial<InstagramContent>) => {
    if (!current) return;
    saveChannel.mutate({ id: content.id, channel: 'instagram', channelContentId: current.id, data: { ...current, ...updates } });
  }, [content.id, current, saveChannel]);

  const debouncedSaveCurrent = useCallback((updates: Partial<InstagramContent>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveCurrent(updates), 500);
  }, [saveCurrent]);

  // ─── Template style (derived from first slide's canvas or default) ───
  const templateStyle: CardCanvasData = slides[0]?.canvas || DEFAULT_CANVAS;

  // ─── Apply style change to ALL slides ───
  const updateStyleForAll = (getUpdatedCanvas: (canvas: CardCanvasData) => CardCanvasData) => {
    if (!current) return;
    const updated = slides.map((s) => {
      const canvas = s.canvas || templateStyle;
      return { ...s, canvas: getUpdatedCanvas(canvas) };
    });
    setLocalSlides(updated);
    saveCurrent({ slides: updated });
  };

  const updateBlockStyleForAll = (blockId: string, updates: Partial<TextBlock>) => {
    updateStyleForAll((canvas) => ({
      ...canvas,
      textBlocks: canvas.textBlocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } : b
      ),
    }));
  };

  // ─── Apply template preset to all ───
  const applyTemplateToAll = (templateId: string) => {
    if (!current) return;
    const tmpl = CARD_NEWS_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    const updated = slides.map((s) => ({
      ...s,
      canvas: applyTemplate(tmpl, s.title || '', s.body || ''),
    }));
    setLocalSlides(updated);
    saveCurrent({ slides: updated, templateId });
  };

  // ─── Slide CRUD ───
  const updateSlide = (slideId: string, updates: Partial<InstagramSlide>) => {
    if (!current) return;
    const updated = slides.map((s) => (s.id === slideId ? { ...s, ...updates } : s));
    setLocalSlides(updated);
    debouncedSaveCurrent({ slides: updated });
  };

  const deleteSlide = (slideId: string) => {
    if (!current) return;
    const updated = slides.filter((s) => s.id !== slideId);
    setLocalSlides(updated);
    saveCurrent({ slides: updated });
    setSelectedSlideIdx(null);
  };

  const addSlide = () => {
    if (!current) return;
    const newSlide: InstagramSlide = {
      id: `is-${Date.now()}-${slides.length}`,
      type: 'content',
      title: '',
      body: '',
      textOverlay: '',
      canvas: {
        ...templateStyle,
        textBlocks: templateStyle.textBlocks.map((b) => ({ ...b, text: '' })),
      },
    };
    const updated = [...slides, newSlide];
    setLocalSlides(updated);
    saveCurrent({ slides: updated });
  };

  // ─── Batch Image Generation ───
  const batchAbortRef = useRef(false);

  const handleBatchGenerate = async () => {
    if (!current || batchGenerating) return;
    setBatchGenerating(true);
    batchAbortRef.current = false;
    const targets = slides.filter((s) => s.imagePrompt && !s.imageUrl && !s.canvas?.imageUrl);
    for (let i = 0; i < targets.length; i++) {
      if (batchAbortRef.current) break;
      setBatchProgress(`${i + 1}/${targets.length}`);
      try {
        await new Promise<void>((resolve) => {
          genImage.mutate(
            { contentId: content.id, channel: 'instagram', targetId: targets[i].id, imagePrompt: buildImagePrompt(targets[i].imagePrompt!), modelId: imageModelId, aspectRatio: imageAspectRatio },
            { onSuccess: () => resolve(), onError: () => resolve() },
          );
        });
        if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 1000));
      } catch { /* skip */ }
    }
    setBatchGenerating(false);
    setBatchProgress('');
  };

  const handleBatchStop = () => {
    batchAbortRef.current = true;
  };

  // ─── Empty State ───
  if (!current && !isGenerating) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <button className="px-4 py-1.5 bg-pink-500 text-white rounded-md text-xs font-medium hover:bg-pink-600" onClick={handleGenerate}>
            ✨ AI 카드뉴스 생성
          </button>
          <ChannelModelSelector type="text" value={textModelId} onChange={setTextModelId} label="텍스트:" />
          <ChannelModelSelector type="image" value={imageModelId} onChange={setImageModelId} label="이미지:" />
        </div>
        <p className="text-sm text-gray-400">기본글을 기반으로 인스타그램 카드뉴스를 생성합니다.</p>
      </div>
    );
  }

  const titleBlock = templateStyle.textBlocks.find((b) => b.id === 'title');
  const bodyBlock = templateStyle.textBlocks.find((b) => b.id === 'body');

  return (
    <div className="flex flex-col h-full">
      {/* ═══ Action Bar ═══ */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2 flex-wrap">
        <button className="px-3 py-1.5 bg-pink-500 text-white rounded-md text-xs hover:bg-pink-600 disabled:opacity-50" onClick={handleGenerate} disabled={isGenerating} title="AI로 카드뉴스 텍스트를 다시 생성합니다">
          {isGenerating ? '⏳ 생성 중...' : '✨ AI 재생성'}
        </button>
        <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50" onClick={addSlide} title="빈 슬라이드를 추가합니다">
          + 슬라이드
        </button>
        {current && slides.length > 0 && (
          <>
            <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50" onClick={() => setPreviewIdx(0)} title="카드뉴스를 전체 화면으로 미리보기합니다">
              👁 미리보기
            </button>
            <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50" onClick={() => downloadAllSlides(slides, current?.caption)} title="모든 슬라이드를 PNG로 저장합니다">
              💾 전체 저장
            </button>
          </>
        )}
        <ImageStyleInput value={imageStyle} onChange={setImageStyle} />
        <select className="px-2 py-1.5 border border-gray-200 rounded text-[10px]" value={imageAspectRatio} onChange={(e) => setImageAspectRatio(e.target.value)} title="이미지 비율">
          <option value="4:3">4:3 가로</option>
          <option value="3:4">3:4 세로</option>
          <option value="16:9">16:9 와이드</option>
          <option value="9:16">9:16 세로 와이드</option>
          <option value="1:1">1:1 정사각</option>
          <option value="3:2">3:2</option>
          <option value="2:3">2:3</option>
        </select>
        {current && slides.some((s) => s.imagePrompt && !s.imageUrl && !s.canvas?.imageUrl) && !batchGenerating && (
          <button
            className="px-3 py-1.5 bg-purple-500 text-white rounded-md text-xs hover:bg-purple-600"
            onClick={handleBatchGenerate}
            title="이미지가 없는 모든 슬라이드에 이미지를 일괄 생성합니다"
          >
            🎨 전체 이미지 생성
          </button>
        )}
        {batchGenerating && (
          <button
            className="px-3 py-1.5 bg-red-500 text-white rounded-md text-xs hover:bg-red-600"
            onClick={handleBatchStop}
            title="이미지 생성을 중지합니다"
          >
            ⏹ 중지 ({batchProgress})
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ChannelModelSelector type="text" value={textModelId} onChange={setTextModelId} label="텍스트:" />
          <ChannelModelSelector type="image" value={imageModelId} onChange={setImageModelId} label="이미지:" />
          {current && (
            <button className="px-3 py-1.5 border border-red-200 text-red-500 rounded-md text-xs hover:bg-red-50"
              onClick={() => { if (confirm('카드뉴스를 삭제하시겠습니까?')) deleteCardNews.mutate({ id: content.id, channel: 'instagram', channelContentId: current.id }); }}
              title="카드뉴스 전체를 삭제합니다">
              🗑 삭제
            </button>
          )}
        </div>
      </div>

      {current && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* ═══ Left: Template Style Editor (전체 반영) ═══ */}
            <div className="w-64 shrink-0 border-r bg-gray-50 p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              <h3 className="text-xs font-bold text-gray-700">🎨 스타일 (전체 반영)</h3>

              {/* Template Presets (built-in + saved) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] text-gray-500">프리셋</div>
                  <button className="text-[9px] text-blue-500 hover:text-blue-700 disabled:opacity-50"
                    disabled={updateTemplateMutation.isPending || saveTemplateMutation.isPending}
                    onClick={() => {
                      const customTmpl = savedTemplates?.find((t: any) => t.id === current.templateId);
                      if (customTmpl) {
                        // 선택된 커스텀 프리셋에 덮어쓰기
                        updateTemplateMutation.mutate({ id: customTmpl.id, data: { canvas: templateStyle } });
                      } else {
                        // 커스텀 프리셋이 선택 안 된 상태면 새로 저장
                        const name = prompt('프리셋 이름을 입력하세요');
                        if (name?.trim()) saveTemplateMutation.mutate({ name: name.trim(), canvas: templateStyle });
                      }
                    }}
                    title={savedTemplates?.some((t: any) => t.id === current.templateId) ? '현재 스타일을 선택된 프리셋에 저장' : '현재 스타일을 새 프리셋으로 저장'}>
                    {updateTemplateMutation.isPending || saveTemplateMutation.isPending ? '⏳' : '💾 저장'}
                  </button>
                </div>
                {/* New preset input */}
                <NewPresetInput onSave={(name) => saveTemplateMutation.mutate({ name, canvas: templateStyle })} isPending={saveTemplateMutation.isPending} />
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Built-in templates */}
                  {CARD_NEWS_TEMPLATES.map((tmpl) => (
                    <button key={tmpl.id} onClick={() => applyTemplateToAll(tmpl.id)}
                      className={`rounded overflow-hidden border-2 transition-all ${current.templateId === tmpl.id ? 'border-pink-500' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="aspect-[4/5] flex flex-col items-center justify-center p-0.5" style={{ backgroundColor: tmpl.canvas.bgColor }}>
                        <div className="text-[5px] font-bold" style={{ color: tmpl.canvas.textBlocks[0]?.color }}>제목</div>
                        <div className="text-[4px] mt-0.5" style={{ color: tmpl.canvas.textBlocks[1]?.color }}>본문</div>
                      </div>
                      <div className="text-[8px] text-center py-0.5 bg-white">{tmpl.name}</div>
                    </button>
                  ))}
                  {/* Saved custom templates */}
                  {savedTemplates?.map((tmpl: any) => (
                    <SavedTemplateCard
                      key={tmpl.id}
                      tmpl={tmpl}
                      isActive={current.templateId === tmpl.id}
                      onApply={() => {
                        if (!current) return;
                        const updated = slides.map((s: InstagramSlide) => ({
                          ...s,
                          canvas: {
                            ...tmpl.canvas,
                            textBlocks: tmpl.canvas.textBlocks.map((b: any) => {
                              const existing = s.canvas?.textBlocks.find((eb: TextBlock) => eb.id === b.id);
                              return { ...b, text: existing?.text || '' };
                            }),
                          },
                        }));
                        setLocalSlides(updated);
                        saveCurrent({ slides: updated, templateId: tmpl.id });
                      }}
                      onRename={(newName) => {
                        updateTemplateMutation.mutate({ id: tmpl.id, data: { name: newName } });
                      }}
                      onDelete={() => { if (confirm(`'${tmpl.name}' 삭제?`)) deleteTemplateMutation.mutate(tmpl.id); }}
                    />
                  ))}
                </div>
              </div>

              {/* Background Color */}
              <div>
                <div className="text-[10px] text-gray-500 mb-1.5">배경색</div>
                <div className="flex items-center gap-2">
                  <input type="color" value={templateStyle.bgColor} className="w-8 h-8 rounded border cursor-pointer"
                    onChange={(e) => updateStyleForAll((c) => ({ ...c, bgColor: e.target.value }))} />
                  <span className="text-[10px] text-gray-400 font-mono">{templateStyle.bgColor}</span>
                </div>
              </div>

              {/* Image Y Position */}
              <div>
                <div className="text-[10px] text-gray-500 mb-1.5">이미지 위치 (상하)</div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-400">상</span>
                  <input type="range" min="0" max="100" value={templateStyle.imageY} className="flex-1 h-1 accent-pink-500"
                    onChange={(e) => updateStyleForAll((c) => ({ ...c, imageY: Number(e.target.value) }))} />
                  <span className="text-[9px] text-gray-400">하</span>
                  <span className="text-[10px] text-gray-400 w-7 text-right">{templateStyle.imageY}%</span>
                </div>
              </div>

              {/* Title Block Style */}
              {titleBlock && (
                <div className="space-y-2">
                  <div className="text-[10px] text-gray-500 font-medium">제목 스타일</div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-400 w-8">크기</label>
                    <input type="number" className="w-14 text-xs border rounded p-1" value={titleBlock.fontSize}
                      onChange={(e) => updateBlockStyleForAll('title', { fontSize: Number(e.target.value) })} />
                    <input type="color" className="w-6 h-6 rounded border cursor-pointer" value={titleBlock.color}
                      onChange={(e) => updateBlockStyleForAll('title', { color: e.target.value })} />
                    <button className={`w-6 h-6 rounded border text-[10px] font-bold ${titleBlock.fontWeight === 'bold' ? 'bg-gray-800 text-white' : 'bg-white'}`}
                      onClick={() => updateBlockStyleForAll('title', { fontWeight: titleBlock.fontWeight === 'bold' ? 'normal' : 'bold' })}>B</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-400 w-8">위치</label>
                    <span className="text-[9px] text-gray-400">X</span>
                    <input type="number" className="w-10 text-[10px] border rounded p-0.5" value={titleBlock.x}
                      onChange={(e) => updateBlockStyleForAll('title', { x: Number(e.target.value) })} />
                    <span className="text-[9px] text-gray-400">Y</span>
                    <input type="number" className="w-10 text-[10px] border rounded p-0.5" value={titleBlock.y}
                      onChange={(e) => updateBlockStyleForAll('title', { y: Number(e.target.value) })} />
                    <span className="text-[9px] text-gray-400">W</span>
                    <input type="number" className="w-10 text-[10px] border rounded p-0.5" value={titleBlock.width}
                      onChange={(e) => updateBlockStyleForAll('title', { width: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-center gap-1">
                    {(['left', 'center', 'right', 'justify'] as const).map((a) => (
                      <button key={a} className={`px-1.5 py-0.5 rounded text-[9px] ${titleBlock.textAlign === a ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
                        onClick={() => updateBlockStyleForAll('title', { textAlign: a })}>
                        {a === 'left' ? '◀' : a === 'center' ? '◆' : a === 'right' ? '▶' : '☰'}
                      </button>
                    ))}
                    <label className="flex items-center gap-1 text-[9px] text-gray-400 ml-2">
                      <input type="checkbox" checked={titleBlock.shadow || false}
                        onChange={(e) => updateBlockStyleForAll('title', { shadow: e.target.checked })} />
                      그림자
                    </label>
                  </div>
                </div>
              )}

              {/* Body Block Style */}
              {bodyBlock && (
                <div className="space-y-2">
                  <div className="text-[10px] text-gray-500 font-medium">본문 스타일</div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-400 w-8">크기</label>
                    <input type="number" className="w-14 text-xs border rounded p-1" value={bodyBlock.fontSize}
                      onChange={(e) => updateBlockStyleForAll('body', { fontSize: Number(e.target.value) })} />
                    <input type="color" className="w-6 h-6 rounded border cursor-pointer" value={bodyBlock.color}
                      onChange={(e) => updateBlockStyleForAll('body', { color: e.target.value })} />
                    <button className={`w-6 h-6 rounded border text-[10px] font-bold ${bodyBlock.fontWeight === 'bold' ? 'bg-gray-800 text-white' : 'bg-white'}`}
                      onClick={() => updateBlockStyleForAll('body', { fontWeight: bodyBlock.fontWeight === 'bold' ? 'normal' : 'bold' })}>B</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-400 w-8">위치</label>
                    <span className="text-[9px] text-gray-400">X</span>
                    <input type="number" className="w-10 text-[10px] border rounded p-0.5" value={bodyBlock.x}
                      onChange={(e) => updateBlockStyleForAll('body', { x: Number(e.target.value) })} />
                    <span className="text-[9px] text-gray-400">Y</span>
                    <input type="number" className="w-10 text-[10px] border rounded p-0.5" value={bodyBlock.y}
                      onChange={(e) => updateBlockStyleForAll('body', { y: Number(e.target.value) })} />
                    <span className="text-[9px] text-gray-400">W</span>
                    <input type="number" className="w-10 text-[10px] border rounded p-0.5" value={bodyBlock.width}
                      onChange={(e) => updateBlockStyleForAll('body', { width: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-center gap-1">
                    {(['left', 'center', 'right', 'justify'] as const).map((a) => (
                      <button key={a} className={`px-1.5 py-0.5 rounded text-[9px] ${bodyBlock.textAlign === a ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
                        onClick={() => updateBlockStyleForAll('body', { textAlign: a })}>
                        {a === 'left' ? '◀' : a === 'center' ? '◆' : a === 'right' ? '▶' : '☰'}
                      </button>
                    ))}
                    <label className="flex items-center gap-1 text-[9px] text-gray-400 ml-2">
                      <input type="checkbox" checked={bodyBlock.shadow || false}
                        onChange={(e) => updateBlockStyleForAll('body', { shadow: e.target.checked })} />
                      그림자
                    </label>
                  </div>
                </div>
              )}

              {/* Caption & Hashtags */}
              <div className="space-y-2 pt-2 border-t">
                <div className="text-[10px] text-gray-500 font-medium">캡션</div>
                <textarea className="w-full text-[10px] border rounded p-1.5 resize-none min-h-[40px]" value={current.caption}
                  onChange={(e) => saveCurrent({ caption: e.target.value })} />
                <div className="text-[10px] text-gray-500 font-medium">해시태그</div>
                <input className="w-full text-[10px] border rounded p-1.5 text-blue-500" value={current.hashtags.join(' ')}
                  onChange={(e) => saveCurrent({ hashtags: e.target.value.split(/\s+/).filter(Boolean) })} />
              </div>
            </div>

            {/* ═══ Right: Slides Grid (editor inline under each card) ═══ */}
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="grid grid-cols-3 gap-4">
                {slides.map((slide, i) => (
                  <div key={slide.id}>
                    <SlideCard
                      slide={slide}
                      index={i}
                      isSelected={selectedSlideIdx === i}
                      onSelect={() => setSelectedSlideIdx(selectedSlideIdx === i ? null : i)}
                      onDelete={() => deleteSlide(slide.id)}
                      onGenerateImage={() => slide.imagePrompt && genImage.mutate({
                        contentId: content.id, channel: 'instagram', targetId: slide.id,
                        imagePrompt: buildImagePrompt(slide.imagePrompt), modelId: imageModelId, aspectRatio: imageAspectRatio,
                      })}
                      onDeleteImage={() => {
                        const canvas = slide.canvas ? { ...slide.canvas, imageUrl: null } : undefined;
                        updateSlide(slide.id, { imageUrl: undefined, canvas });
                      }}
                      onSaveImage={() => downloadSlide(slide, i)}
                      isGeneratingImage={genImage.isPending}
                    />
                    {/* Inline editor under selected card */}
                    {selectedSlideIdx === i && (
                      <div className="mt-1.5 border border-pink-200 rounded-lg p-2.5 bg-pink-50/50 space-y-1.5">
                        <textarea className="w-full text-[11px] border rounded p-1.5 font-medium resize-none min-h-[32px]" placeholder="제목" value={slide.title || ''}
                          onChange={(e) => {
                            const title = e.target.value;
                            const canvas = slide.canvas ? { ...slide.canvas, textBlocks: slide.canvas.textBlocks.map((b) => b.id === 'title' ? { ...b, text: title } : b) } : undefined;
                            updateSlide(slide.id, { title, canvas });
                          }} />
                        <textarea className="w-full text-[11px] border rounded p-1.5 resize-none min-h-[48px]" placeholder="본문" value={slide.body || ''}
                          onChange={(e) => {
                            const body = e.target.value;
                            const canvas = slide.canvas ? { ...slide.canvas, textBlocks: slide.canvas.textBlocks.map((b) => b.id === 'body' ? { ...b, text: body } : b) } : undefined;
                            updateSlide(slide.id, { body, canvas });
                          }} />
                        <div className="flex gap-1">
                          <input className="flex-1 text-[10px] border rounded p-1.5 text-gray-500" placeholder="이미지 프롬프트" value={slide.imagePrompt || ''}
                            onChange={(e) => updateSlide(slide.id, { imagePrompt: e.target.value })} />
                          <button className="px-2 bg-pink-500 text-white rounded text-[9px] hover:bg-pink-600 disabled:opacity-50 shrink-0"
                            disabled={genImage.isPending || !slide.imagePrompt}
                            onClick={() => genImage.mutate({
                              contentId: content.id, channel: 'instagram', targetId: slide.id,
                              imagePrompt: buildImagePrompt(slide.imagePrompt!), modelId: imageModelId, aspectRatio: imageAspectRatio,
                            })}>🎨</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Preview Modal ═══ */}
      <SlidePreviewModal slides={slides} previewIdx={previewIdx} setPreviewIdx={setPreviewIdx} />
    </div>
  );
}
