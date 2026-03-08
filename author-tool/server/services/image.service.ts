import { putObject, deleteObject, getPublicUrl } from './r2.service.js';
import { generateImage } from './gemini.provider.js';

const IMAGES_PREFIX = 'images/';

function generateFilename(ext = 'png'): string {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return map[ext.toLowerCase()] ?? 'image/png';
}

export const ImageService = {
  async save(buffer: Buffer, originalName?: string): Promise<string> {
    const ext = originalName?.split('.').pop() ?? 'png';
    const filename = generateFilename(ext);
    const key = `${IMAGES_PREFIX}${filename}`;
    await putObject(key, buffer, mimeFromExt(ext));
    return getPublicUrl(key);
  },

  async generate(prompt: string, model?: string): Promise<string> {
    const buffer = await generateImage(prompt, model);
    return ImageService.save(buffer, 'generated.png');
  },

  async delete(url: string): Promise<void> {
    if (url.startsWith('/uploads/')) {
      // Legacy local path
      const filename = url.replace('/uploads/', '');
      await deleteObject(`${IMAGES_PREFIX}${filename}`);
    } else if (url.includes(`/${IMAGES_PREFIX}`)) {
      // Full R2 URL — extract key
      const idx = url.indexOf(IMAGES_PREFIX);
      const key = url.slice(idx);
      await deleteObject(key);
    }
  },
};
