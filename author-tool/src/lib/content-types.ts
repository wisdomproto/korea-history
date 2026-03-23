// author-tool/src/lib/content-types.ts

// ─── Content (top-level) ───
export interface Content {
  id: string;
  title: string;
  sourceType: 'exam' | 'note' | 'free';
  sourceId?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export type ContentMeta = Content; // index.json stores full Content objects

// ─── Base Article (1:1 with Content) ───
export interface BaseArticle {
  contentId: string;
  html: string;
  keywords: string[];
  summary: string;
}

// ─── Blog ───
export interface BlogContent {
  id: string;
  contentId: string;
  title: string;
  seoKeywords: string[];
  seoScore?: number;
  cards: BlogCard[];
  modelId: string;
}

export interface BlogCard {
  id: string;
  type: 'text' | 'image' | 'divider' | 'quote' | 'list';
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
}

// ─── Instagram Card News ───
export interface InstagramContent {
  id: string;
  contentId: string;
  caption: string;
  hashtags: string[];
  slides: InstagramSlide[];
  textModelId: string;
  imageModelId: string;
}

export interface InstagramSlide {
  id: string;
  type: 'hook' | 'question' | 'answer' | 'cta' | 'content';
  imageUrl?: string;
  imagePrompt?: string;
  textOverlay: string;
  backgroundColor?: string;
}

// ─── Threads ───
export interface ThreadsContent {
  id: string;
  contentId: string;
  posts: ThreadsPost[];
  modelId: string;
}

export interface ThreadsPost {
  id: string;
  role: 'hook' | 'content' | 'cta';
  text: string;
  imageUrl?: string;
  imagePrompt?: string;
}

// ─── Long-form Script ───
export interface LongFormContent {
  id: string;
  contentId: string;
  videoTitle: string;
  targetDuration: string;
  scenes: LongFormScene[];
  modelId: string;
  imageModelId: string;
}

export interface LongFormScene {
  id: string;
  sectionType: 'intro' | 'main' | 'transition' | 'cta' | 'outro';
  title: string;
  narration: string;
  direction: string;
  imageUrl?: string;
  imagePrompt?: string;
}

// ─── Short-form Script ───
export interface ShortFormContent {
  id: string;
  contentId: string;
  targetDuration: string;
  hook: string;
  body: string;
  cta: string;
  direction: string;
  modelId: string;
}

// ─── Full content file (ct-{id}.json) ───
export interface ContentFile {
  content: Content;
  baseArticle: BaseArticle | null;
  blog: BlogContent[];
  instagram: InstagramContent[];
  threads: ThreadsContent[];
  longForm: LongFormContent[];
  shortForm: ShortFormContent[];
}

// ─── Channel type union ───
export type ChannelType = 'blog' | 'instagram' | 'threads' | 'longform' | 'shortform';

export const CHANNEL_TABS: { key: ChannelType | 'base'; label: string; icon: string }[] = [
  { key: 'base', label: '기본글', icon: '📝' },
  { key: 'blog', label: '블로그', icon: '📖' },
  { key: 'instagram', label: '카드뉴스', icon: '📸' },
  { key: 'threads', label: '스레드', icon: '🧵' },
  { key: 'longform', label: '롱폼', icon: '🎬' },
  { key: 'shortform', label: '숏폼', icon: '⚡' },
];
