// author-tool/src/features/content/api/content.api.ts
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/axios';
import type { ContentMeta, ContentFile, ChannelType } from '../../../lib/content-types';

const BASE = '/contents';

// ─── CRUD ───
export async function fetchContents(): Promise<ContentMeta[]> {
  return apiGet<ContentMeta[]>(BASE);
}

export async function fetchContent(id: string): Promise<ContentFile> {
  return apiGet<ContentFile>(`${BASE}/${id}`);
}

export async function createContent(
  title: string,
  sourceType: 'exam' | 'note' | 'free',
  sourceId?: string,
): Promise<ContentFile> {
  return apiPost<ContentFile>(BASE, { title, sourceType, sourceId });
}

export async function updateContent(
  id: string,
  updates: Partial<{ title: string; status: string }>,
): Promise<ContentFile> {
  return apiPut<ContentFile>(`${BASE}/${id}`, updates);
}

export async function deleteContent(id: string): Promise<void> {
  return apiDelete<void>(`${BASE}/${id}`);
}

// ─── Base Article ───
export async function saveBaseArticle(
  id: string,
  baseArticle: { html: string; keywords: string[]; summary: string },
): Promise<ContentFile> {
  return apiPut<ContentFile>(`${BASE}/${id}/base-article`, baseArticle);
}

// ─── Channel ───
export async function saveChannelContent(
  id: string,
  channel: ChannelType,
  channelContentId: string,
  channelData: any,
): Promise<ContentFile> {
  return apiPut<ContentFile>(
    `${BASE}/${id}/channels/${channel}/${channelContentId}`,
    channelData,
  );
}

export async function deleteChannelContent(
  id: string,
  channel: ChannelType,
  channelContentId: string,
): Promise<ContentFile> {
  return apiDelete<ContentFile>(
    `${BASE}/${id}/channels/${channel}/${channelContentId}`,
  );
}

// ─── Image Generation ───
export async function generateImage(
  id: string,
  channel: ChannelType,
  targetId: string,
  imagePrompt: string,
  modelId?: string,
): Promise<string> {
  return apiPost<string>(`${BASE}/${id}/channels/${channel}/image`, {
    targetId,
    imagePrompt,
    modelId,
  });
}

// ─── SSE Generation ───
export function generateSSE(
  id: string,
  path: string, // e.g., "base-article/generate" or "generate/blog"
  body: any,
  callbacks: {
    onChunk?: (content: string) => void;
    onComplete?: (data: any) => void;
    onError?: (message: string) => void;
  },
): AbortController {
  const controller = new AbortController();

  fetch(`/api/contents/${id}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'chunk') callbacks.onChunk?.(event.content);
            else if (event.type === 'complete') callbacks.onComplete?.(event.data);
            else if (event.type === 'error') callbacks.onError?.(event.message);
          } catch { /* ignore parse errors */ }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError?.(err.message);
      }
    });

  return controller;
}
