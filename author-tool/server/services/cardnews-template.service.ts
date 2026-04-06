// author-tool/server/services/cardnews-template.service.ts
import { getObjectText, putObject } from './r2.service.js';

const R2_KEY = 'cardnews-templates.json';

export interface SavedTemplate {
  id: string;
  name: string;
  canvas: {
    bgColor: string;
    imageUrl: null;
    imageY: number;
    textBlocks: {
      id: string;
      text: string;
      x: number;
      y: number;
      fontSize: number;
      color: string;
      fontWeight: 'normal' | 'bold';
      textAlign: 'left' | 'center' | 'right';
      width: number;
      shadow?: boolean;
      hidden?: boolean;
    }[];
  };
  createdAt: string;
}

async function readAll(): Promise<SavedTemplate[]> {
  try {
    const raw = await getObjectText(R2_KEY);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAll(templates: SavedTemplate[]): Promise<void> {
  await putObject(R2_KEY, JSON.stringify(templates, null, 2));
}

export async function listTemplates(): Promise<SavedTemplate[]> {
  return readAll();
}

export async function saveTemplate(name: string, canvas: SavedTemplate['canvas']): Promise<SavedTemplate> {
  const templates = await readAll();
  const tmpl: SavedTemplate = {
    id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    canvas: { ...canvas, imageUrl: null, textBlocks: canvas.textBlocks.map((b) => ({ ...b, text: '' })) },
    createdAt: new Date().toISOString(),
  };
  templates.push(tmpl);
  await writeAll(templates);
  return tmpl;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const templates = await readAll();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) return false;
  await writeAll(filtered);
  return true;
}
