// author-tool/server/services/content.service.ts
import { deleteObject, listObjects, putObject, getObjectText } from './r2.service.js';
import { getChannelKey } from './content-constants.js';
import type { ContentMeta, ContentFile, ChannelContentItem } from './content-constants.js';

export type { ContentMeta, ContentFile, ChannelContentItem };

const R2_PREFIX = 'contents';
const INDEX_KEY = `${R2_PREFIX}/index.json`;

function contentFileKey(id: string): string {
  return `${R2_PREFIX}/${id}.json`;
}

function generateId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `ct-${ts}-${rand}`;
}

// ─── Index operations ───
export async function readIndex(): Promise<ContentMeta[]> {
  try {
    const raw = await getObjectText(INDEX_KEY);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeIndex(index: ContentMeta[]): Promise<void> {
  await putObject(INDEX_KEY, JSON.stringify(index, null, 2), 'application/json');
}

// ─── Content file operations ───
export async function readContentFile(id: string): Promise<ContentFile | null> {
  try {
    const raw = await getObjectText(contentFileKey(id));
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeContentFile(id: string, data: ContentFile): Promise<void> {
  await putObject(contentFileKey(id), JSON.stringify(data, null, 2), 'application/json');
}

// ─── CRUD ───
export async function createContent(
  title: string,
  sourceType: 'exam' | 'note' | 'free',
  sourceId?: string,
  projectId?: string,
): Promise<ContentFile> {
  const id = generateId();
  const now = new Date().toISOString();
  const content: ContentMeta = {
    id,
    title,
    sourceType,
    sourceId,
    projectId,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  const file: ContentFile = {
    content,
    baseArticle: null,
    blog: [],
    instagram: [],
    threads: [],
    longForm: [],
    shortForm: [],
  };

  await writeContentFile(id, file);

  const index = await readIndex();
  index.unshift(content);
  await writeIndex(index);

  return file;
}

export async function updateContentMeta(
  id: string,
  updates: Partial<Pick<ContentMeta, 'title' | 'status'>>,
): Promise<ContentFile | null> {
  const file = await readContentFile(id);
  if (!file) return null;

  if (updates.title !== undefined) file.content.title = updates.title;
  if (updates.status !== undefined) file.content.status = updates.status;
  file.content.updatedAt = new Date().toISOString();

  await writeContentFile(id, file);

  const index = await readIndex();
  const idx = index.findIndex((c) => c.id === id);
  if (idx >= 0) {
    index[idx] = file.content;
    await writeIndex(index);
  }

  return file;
}

export async function deleteContent(id: string): Promise<boolean> {
  const file = await readContentFile(id);
  if (!file) return false;

  // Delete JSON file from R2
  try {
    await deleteObject(contentFileKey(id));
  } catch { /* ignore */ }

  // Delete R2 images
  try {
    const keys = await listObjects(`contents/${id}/`);
    for (const key of keys) {
      await deleteObject(key);
    }
  } catch { /* ignore R2 errors */ }

  // Update index
  const index = await readIndex();
  const filtered = index.filter((c) => c.id !== id);
  await writeIndex(filtered);

  return true;
}

// ─── Base article ───
export async function saveBaseArticle(
  id: string,
  baseArticle: { html: string; keywords: string[]; summary: string },
): Promise<ContentFile | null> {
  const file = await readContentFile(id);
  if (!file) return null;

  file.baseArticle = { contentId: id, ...baseArticle };
  file.content.updatedAt = new Date().toISOString();
  await writeContentFile(id, file);

  return file;
}

// ─── Channel data save ───
export async function saveChannelContent(
  id: string,
  channel: string,
  channelContentId: string,
  data: any,
): Promise<ContentFile | null> {
  const file = await readContentFile(id);
  if (!file) return null;

  const channelKey = getChannelKey(channel) as keyof ContentFile | null;
  if (!channelKey) return null;

  const arr = file[channelKey] as ChannelContentItem[];
  if (!Array.isArray(arr)) return null;
  const idx = arr.findIndex((c) => c.id === channelContentId);
  if (idx >= 0) {
    arr[idx] = data;
  } else {
    arr.push(data);
  }

  file.content.updatedAt = new Date().toISOString();
  await writeContentFile(id, file);

  return file;
}

export async function deleteChannelContent(
  id: string,
  channel: string,
  channelContentId: string,
): Promise<ContentFile | null> {
  const file = await readContentFile(id);
  if (!file) return null;

  const channelKey = getChannelKey(channel);
  if (!channelKey) return null;

  const arr = file[channelKey] as ChannelContentItem[];
  if (!Array.isArray(arr)) return null;
  (file as Record<string, unknown>)[channelKey] = arr.filter((c) => c.id !== channelContentId);

  file.content.updatedAt = new Date().toISOString();
  await writeContentFile(id, file);

  return file;
}

// getChannelKey imported from content-constants.ts
