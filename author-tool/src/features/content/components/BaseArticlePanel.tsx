// author-tool/src/features/content/components/BaseArticlePanel.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import type { ContentFile } from '../../../lib/content-types';
import { useSaveBaseArticle } from '../hooks/useContent';
import { useChannelGeneration } from '../hooks/useChannelGeneration';
import { apiGet } from '../../../lib/axios';
import { ChannelModelSelector } from './ChannelModelSelector';

interface Props {
  contentFile: ContentFile;
}

interface SourceQuestion {
  content: string;
  choices: string[];
  correctAnswer: number;
  explanation?: string;
  era?: string;
  category?: string;
}

interface SourceNote {
  title: string;
  content: string; // HTML content
}

export function BaseArticlePanel({ contentFile }: Props) {
  const { content, baseArticle } = contentFile;
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [modelId, setModelId] = useState('gemini-2.5-flash');
  const [extraPrompt, setExtraPrompt] = useState('');
  const [showSource, setShowSource] = useState(false);
  const [sourceData, setSourceData] = useState<SourceQuestion | SourceNote | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  const saveBase = useSaveBaseArticle();
  const { isGenerating, generate } = useChannelGeneration({
    contentId: content.id,
    path: 'base-article/generate',
  });

  // Sync editor content when baseArticle changes (content switch or AI generation)
  const lastSyncedHtml = useRef<string>('');
  useEffect(() => {
    if (editorRef.current && baseArticle?.html && baseArticle.html !== lastSyncedHtml.current) {
      // Don't overwrite if user is actively typing (check focus)
      const isUserEditing = document.activeElement === editorRef.current;
      if (!isUserEditing || lastSyncedHtml.current === '') {
        editorRef.current.innerHTML = baseArticle.html;
      }
      lastSyncedHtml.current = baseArticle.html;
    }
  }, [content.id, baseArticle?.html]);

  // Auto-save with debounce
  const handleInput = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (!editorRef.current) return;
      const html = editorRef.current.innerHTML;
      saveBase.mutate({
        id: content.id,
        html,
        keywords: baseArticle?.keywords || [],
        summary: baseArticle?.summary || '',
      });
    }, 500);
  }, [content.id, baseArticle]);

  // Toolbar commands
  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  // AI Generate
  const handleGenerate = () => {
    generate({ modelId, extraPrompt: extraPrompt.trim() || undefined });
  };

  // View source data
  const handleViewSource = async () => {
    if (!content.sourceId) return;

    setSourceLoading(true);
    setShowSource(true);

    try {
      if (content.sourceType === 'exam') {
        // sourceId is "examNumber-questionNumber"
        const [examNum, questionNum] = content.sourceId.split('-');
        const questions = await apiGet<SourceQuestion[]>(
          `/card-news/questions/${examNum}`,
        );
        const q = questions.find(
          (q: any) => q.questionNumber === Number(questionNum),
        );
        setSourceData(q || null);
      } else if (content.sourceType === 'note') {
        const note = await apiGet<SourceNote>(`/notes/${content.sourceId}`);
        setSourceData(note);
      }
    } catch (err) {
      console.error('[소스 보기] 로드 실패:', err);
      setSourceData(null);
    } finally {
      setSourceLoading(false);
    }
  };

  return (
    <div className="p-5">
      {/* Action bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          className="px-4 py-1.5 bg-emerald-500 text-white rounded-md text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? '⏳ 생성 중...' : '✨ AI 기본글 생성'}
        </button>
        <ChannelModelSelector type="text" value={modelId} onChange={setModelId} label="모델:" />
        {content.sourceId && (
          <button
            className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50"
            onClick={handleViewSource}
          >
            📄 소스 보기
          </button>
        )}
      </div>

      {/* Extra prompt */}
      <div className="mb-3">
        <textarea
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          rows={2}
          placeholder="AI에게 추가 지시사항 (예: 초보자 눈높이로 써줘, 핵심 키워드 3개 포함해줘, 2000자 이내로...)"
          value={extraPrompt}
          onChange={(e) => setExtraPrompt(e.target.value)}
        />
      </div>

      {/* Toolbar */}
      <div className="flex gap-1 pb-2 border-b border-gray-100 mb-3">
        {[
          { cmd: 'bold', label: 'B' },
          { cmd: 'italic', label: 'I' },
          { cmd: 'formatBlock', label: 'H2', value: 'h2' },
          { cmd: 'formatBlock', label: 'H3', value: 'h3' },
          { cmd: 'insertUnorderedList', label: '•' },
        ].map((btn) => (
          <button
            key={btn.label}
            className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
            onClick={() => execCommand(btn.cmd, btn.value)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        className="min-h-[300px] border border-gray-200 rounded-lg p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-200 prose prose-sm max-w-none"
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
      />

      <p className="text-[11px] text-gray-400 mt-2">
        기본글을 작성하거나 AI로 생성하세요. 이 글을 기반으로 각 채널별 컨텐츠가 만들어집니다.
      </p>

      {/* Source Modal */}
      {showSource && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowSource(false)}
        >
          <div
            className="bg-white rounded-xl w-[600px] max-h-[80vh] overflow-y-auto p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                📄 소스 원문 ({content.sourceType === 'exam' ? '기출문제' : '요약노트'})
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600 text-xl"
                onClick={() => setShowSource(false)}
              >
                ✕
              </button>
            </div>

            {sourceLoading ? (
              <div className="text-center text-gray-400 py-8">로딩 중...</div>
            ) : !sourceData ? (
              <div className="text-center text-gray-400 py-8">소스를 찾을 수 없습니다</div>
            ) : content.sourceType === 'exam' ? (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-1">문제</div>
                  <p className="text-gray-800">{(sourceData as SourceQuestion).content}</p>
                </div>
                {(sourceData as SourceQuestion).era && (
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                      {(sourceData as SourceQuestion).era}
                    </span>
                    {(sourceData as SourceQuestion).category && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {(sourceData as SourceQuestion).category}
                      </span>
                    )}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-1">선지</div>
                  <ol className="list-decimal pl-5 space-y-1">
                    {(sourceData as SourceQuestion).choices.map((c: string, i: number) => (
                      <li
                        key={i}
                        className={
                          i + 1 === (sourceData as SourceQuestion).correctAnswer
                            ? 'text-emerald-600 font-bold'
                            : ''
                        }
                      >
                        {c}
                        {i + 1 === (sourceData as SourceQuestion).correctAnswer && ' ✓'}
                      </li>
                    ))}
                  </ol>
                </div>
                {(sourceData as SourceQuestion).explanation && (
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">해설</div>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {(sourceData as SourceQuestion).explanation}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-1">제목</div>
                  <p className="text-gray-800 font-medium">{(sourceData as SourceNote).title}</p>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-1">내용</div>
                  <div
                    className="prose prose-sm max-w-none max-h-[400px] overflow-y-auto border border-gray-100 rounded-lg p-4"
                    dangerouslySetInnerHTML={{ __html: (sourceData as SourceNote).content }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
