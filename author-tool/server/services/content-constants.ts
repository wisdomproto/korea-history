// Shared constants for content system — single source of truth

export const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';

// ─── Channel key mapping (URL param → ContentFile field) ───
export const CHANNEL_KEY_MAP: Record<string, string> = {
  blog: 'blog',
  instagram: 'instagram',
  threads: 'threads',
  longform: 'longForm',
  shortform: 'shortForm',
};

export type ChannelParam = keyof typeof CHANNEL_KEY_MAP;

export function getChannelKey(channel: string): string | null {
  return CHANNEL_KEY_MAP[channel] ?? null;
}

// ─── Server-side types (mirrors client content-types.ts) ───
export interface BaseArticle {
  contentId: string;
  html: string;
  keywords: string[];
  summary: string;
}

export interface ContentMeta {
  id: string;
  title: string;
  sourceType: 'exam' | 'note' | 'free';
  sourceId?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface ContentFile {
  content: ContentMeta;
  baseArticle: BaseArticle | null;
  blog: ChannelContentItem[];
  instagram: ChannelContentItem[];
  threads: ChannelContentItem[];
  longForm: ChannelContentItem[];
  shortForm: ChannelContentItem[];
}

// Generic channel content — all channel items have at least id + contentId
export interface ChannelContentItem {
  id: string;
  contentId: string;
  [key: string]: unknown;
}
