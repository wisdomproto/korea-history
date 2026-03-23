// author-tool/src/features/content/components/ThreadsPanel.tsx
import { useState, useRef } from 'react';
import type { ContentFile, ThreadsContent } from '../../../lib/content-types';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { copyToClipboard } from '../api/content.api';
import { useChannelGeneration } from '../hooks/useChannelGeneration';
import { ChannelModelSelector } from './ChannelModelSelector';

interface Props {
  contentFile: ContentFile;
}

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  hook: { bg: 'bg-amber-100', color: 'text-amber-700' },
  content: { bg: 'bg-blue-100', color: 'text-blue-700' },
  cta: { bg: 'bg-green-100', color: 'text-green-700' },
};

export function ThreadsPanel({ contentFile }: Props) {
  const { content, threads } = contentFile;
  const current = threads[0] as ThreadsContent | undefined;
  const [modelId, setModelId] = useState('gemini-2.5-flash');

  const { save, saveNow } = useDebouncedSave(content.id, 'threads');
  const dragRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const { isGenerating, generate } = useChannelGeneration({
    contentId: content.id,
    path: 'generate/threads',
  });

  const handleGenerate = () => {
    generate({ modelId });
  };

  const handleCopyAll = () => {
    if (!current) return;
    const text = current.posts.map((p, i) => `[${i + 1}/${current.posts.length}]\n${p.text}`).join('\n\n---\n\n');
    copyToClipboard(text, '전체 포스트가 복사되었습니다!');
  };

  const updatePost = (postId: string, text: string) => {
    if (!current) return;
    save(current.id, { ...current, posts: current.posts.map((p) => (p.id === postId ? { ...p, text } : p)) });
  };

  const reorderPosts = (fromIdx: number, toIdx: number) => {
    if (!current || fromIdx === toIdx) return;
    const posts = [...current.posts];
    const [moved] = posts.splice(fromIdx, 1);
    posts.splice(toIdx, 0, moved);
    saveNow(current.id, { ...current, posts });
  };

  if (!current && !isGenerating) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <button className="px-4 py-1.5 bg-indigo-500 text-white rounded-md text-xs font-medium hover:bg-indigo-600" onClick={handleGenerate}>
            ✨ AI 스레드 생성
          </button>
          <ChannelModelSelector type="text" value={modelId} onChange={setModelId} label="모델:" />
        </div>
        <p className="text-sm text-gray-400">기본글을 기반으로 스레드 멀티포스트를 생성합니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
        <button className="px-3 py-1.5 bg-indigo-500 text-white rounded-md text-xs hover:bg-indigo-600 disabled:opacity-50" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? '⏳ 생성 중...' : '✨ AI 스레드 생성'}
        </button>
        <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50" onClick={handleCopyAll}>📋 전체 복사</button>
        <div className="ml-auto">
          <ChannelModelSelector type="text" value={modelId} onChange={setModelId} label="모델:" />
        </div>
      </div>

      {current && (
        <div className="flex-1 overflow-y-auto p-5">
          {current.posts.map((post, i) => {
            const style = ROLE_STYLES[post.role] || ROLE_STYLES.content;
            return (
              <div
                key={post.id}
                draggable
                onDragStart={() => { dragRef.current = i; }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                onDragEnd={() => { setDragOver(null); }}
                onDrop={() => { if (dragRef.current !== null) reorderPosts(dragRef.current, i); dragRef.current = null; setDragOver(null); }}
                className={`flex gap-3 mb-4 transition-all ${dragOver === i ? 'border-t-2 border-t-indigo-400 pt-1' : ''}`}
              >
                <div className="flex flex-col items-center cursor-grab">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${style.bg} ${style.color}`}>
                    {i + 1}
                  </div>
                  {i < current.posts.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded mb-1 inline-block ${style.bg} ${style.color}`}>
                    {post.role}
                  </span>
                  <textarea
                    className="w-full border border-gray-200 rounded-md p-2 text-sm resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    value={post.text}
                    onChange={(e) => updatePost(post.id, e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
