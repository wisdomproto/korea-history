import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { putObject, getPublicUrl, deleteObject, listObjects } from './r2.service.js';

const STORAGE_DIR = path.resolve(config.dataDir, '..', 'card-news');
const INDEX_PATH = path.join(STORAGE_DIR, 'index.json');

export interface CardNewsItem {
  id: string;
  type: 'exam' | 'note';
  title: string;
  era?: string;
  /** exam card: examNumber-questionNumber, note card: noteId */
  sourceId: string;
  slides: string[]; // R2 public URLs
  createdAt: string;
}

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function readIndex(): CardNewsItem[] {
  ensureDir();
  if (!fs.existsSync(INDEX_PATH)) return [];
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
}

function writeIndex(items: CardNewsItem[]) {
  ensureDir();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

/** Save card news slides to R2 and add to index. */
export async function saveCardNews(params: {
  type: 'exam' | 'note';
  title: string;
  era?: string;
  sourceId: string;
  slides: Buffer[];
}): Promise<CardNewsItem> {
  const id = `cn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const urls: string[] = [];

  for (let i = 0; i < params.slides.length; i++) {
    const key = `card-news/${id}_slide${i + 1}.png`;
    await putObject(key, params.slides[i], 'image/png');
    urls.push(getPublicUrl(key));
  }

  const item: CardNewsItem = {
    id,
    type: params.type,
    title: params.title,
    era: params.era,
    sourceId: params.sourceId,
    slides: urls,
    createdAt: new Date().toISOString(),
  };

  const index = readIndex();
  index.unshift(item); // newest first
  writeIndex(index);

  return item;
}

/** Get all saved card news items. */
export function getAllCardNews(): CardNewsItem[] {
  return readIndex();
}

/** Delete a card news item and its R2 files. */
export async function deleteCardNews(id: string): Promise<void> {
  const index = readIndex();
  const item = index.find((i) => i.id === id);
  if (!item) return;

  // Delete from R2
  for (let i = 0; i < item.slides.length; i++) {
    const key = `card-news/${id}_slide${i + 1}.png`;
    try { await deleteObject(key); } catch {}
  }

  // Remove from index
  writeIndex(index.filter((i) => i.id !== id));
}
