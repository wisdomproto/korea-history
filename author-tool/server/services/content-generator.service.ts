// author-tool/server/services/content-generator.service.ts
import fs from 'fs/promises';
import path from 'path';
import type { Response } from 'express';
import { generateText, parseJSON } from './gemini.provider.js';
import * as prompts from './prompt-builder.js';
import type { SourceData } from './prompt-builder.js';
import { readContentFile, writeContentFile } from './content.service.js';
import { deleteObject } from './r2.service.js';
import { getChannelKey, DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from './content-constants.js';
import { AppError } from '../middleware.js';
import { config } from '../config.js';

interface GenerateOptions {
  contentId: string;
  channel: string;
  modelId?: string;
  targetDuration?: string;
  keywords?: string[];
}

// Get source data from content file
async function getSourceData(contentId: string) {
  const file = await readContentFile(contentId);
  if (!file) throw new AppError(404, '컨텐츠를 찾을 수 없습니다.');
  return file;
}

export async function generateBaseArticle(
  contentId: string,
  modelId?: string,
  extraPrompt?: string,
  res?: Response,
): Promise<any> {
  const file = await getSourceData(contentId);
  const source = await buildSourceFromContent(file);

  sendSSE(res, { type: 'chunk', content: '기본글 생성 중...' });

  let prompt = prompts.buildBaseArticlePrompt(source);
  if (extraPrompt) {
    prompt += `\n\n[추가 지시사항]\n${extraPrompt}`;
  }
  const raw = await generateText(prompt, modelId);
  const result = parseJSON<{ html: string; keywords: string[]; summary: string }>(
    raw,
    '기본글 생성',
  );

  file.baseArticle = { contentId, ...result };
  file.content.updatedAt = new Date().toISOString();
  await writeContentFile(contentId, file);

  sendSSE(res, { type: 'complete', data: file.baseArticle });
  return file.baseArticle;
}

export async function generateChannelContent(
  opts: GenerateOptions,
  res?: Response,
): Promise<any> {
  const file = await getSourceData(opts.contentId);
  if (!file.baseArticle?.html) {
    throw new AppError(400, '기본글이 없습니다. 먼저 기본글을 작성하세요.');
  }

  const source = await buildSourceFromContent(file);
  const baseHtml = file.baseArticle.html.replace(/<[^>]+>/g, ' ').trim();

  sendSSE(res, { type: 'chunk', content: `${opts.channel} 컨텐츠 생성 중...` });

  let prompt: string;
  switch (opts.channel) {
    case 'blog':
      prompt = prompts.buildBlogPrompt(baseHtml, source);
      if (opts.keywords?.length) {
        prompt += `\n\n[SEO 타겟 키워드]\n메인 키워드: ${opts.keywords[0]}\n보조 키워드: ${opts.keywords.slice(1).join(', ')}\n\n위 키워드를 제목과 본문에 자연스럽게 포함시키세요. 메인 키워드는 제목 앞부분에 배치하고, 본문에 5~6회 포함하세요.`;
      }
      break;
    case 'instagram': {
      // 블로그 카드가 있으면 블로그 기반, 없으면 기본글 기반
      const blogContent = file.blog?.[0];
      if (blogContent?.cards?.length) {
        const blogText = blogContent.cards
          .map((c: any, i: number) => `[카드 ${i + 1}]\n${c.content}`)
          .filter((t: string) => t.trim())
          .join('\n\n');
        prompt = prompts.buildCardNewsPrompt(blogText, source);
      } else {
        prompt = prompts.buildCardNewsPrompt(baseHtml, source);
      }
      break;
    }
    case 'threads':
      prompt = prompts.buildThreadsPrompt(baseHtml, source);
      break;
    case 'longform':
      prompt = prompts.buildLongFormPrompt(baseHtml, source, opts.targetDuration || '8~12분');
      break;
    case 'shortform':
      prompt = prompts.buildShortFormPrompt(baseHtml, source, opts.targetDuration || '30~60초');
      break;
    default:
      throw new AppError(400, `알 수 없는 채널: ${opts.channel}`);
  }

  const raw = await generateText(prompt, opts.modelId);
  const parsed = parseJSON<any>(raw, `${opts.channel} 생성`);

  // Build channel content object with IDs
  const channelContent = buildChannelObject(opts, parsed);

  // Save to file — replace existing (not push), delete old images from R2
  const channelKey = getChannelKey(opts.channel);
  if (channelKey) {
    // Delete old images from R2
    const oldItems = (file as any)[channelKey] as any[];
    if (oldItems?.length) {
      for (const item of oldItems) {
        const targets = item.slides || item.cards || item.scenes || [];
        for (const t of targets) {
          const imgUrl = t.canvas?.imageUrl || t.imageUrl;
          if (imgUrl && imgUrl.includes('.r2.dev/')) {
            const r2Key = imgUrl.split('.r2.dev/')[1]?.split('?')[0];
            if (r2Key) {
              try { await deleteObject(r2Key); } catch { /* ignore */ }
            }
          }
        }
      }
    }
    (file as any)[channelKey] = [channelContent];
    file.content.updatedAt = new Date().toISOString();
    await writeContentFile(opts.contentId, file);
  }

  sendSSE(res, { type: 'complete', data: channelContent });
  return channelContent;
}

function buildChannelObject(opts: GenerateOptions, parsed: any): any {
  const id = `${opts.channel}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const base = { id, contentId: opts.contentId };

  switch (opts.channel) {
    case 'blog':
      return {
        ...base,
        title: parsed.title || '',
        seoKeywords: parsed.seoKeywords || [],
        cards: (parsed.cards || []).map((c: any, i: number) => ({
          id: `bc-${Date.now()}-${i}`,
          type: c.type || 'text',
          content: c.content || '',
          imageUrl: undefined,
          imagePrompt: c.imagePrompt,
        })),
        modelId: opts.modelId || DEFAULT_TEXT_MODEL,
      };
    case 'instagram':
      return {
        ...base,
        caption: parsed.caption || '',
        hashtags: parsed.hashtags || [],
        slides: (parsed.slides || []).map((s: any, i: number) => {
          // Extract title/body — fallback: split textOverlay on first newline
          let title = s.title || '';
          let body = s.body || '';
          if (!title && s.textOverlay) {
            const lines = s.textOverlay.split('\n');
            title = lines[0] || '';
            body = lines.slice(1).join('\n').trim();
          }
          const textOverlay = `${title}\n${body}`.trim();

          return {
            id: `is-${Date.now()}-${i}`,
            type: s.type || 'content',
            title,
            body,
            textOverlay,
            imagePrompt: s.imagePrompt,
            canvas: {
              bgColor: '#18181b',
              imageUrl: null,
              imageY: 50,
              textBlocks: [
                { id: 'title', text: title, x: 8, y: 10, fontSize: 26, color: '#ffffff', fontWeight: 'bold' as const, textAlign: 'left' as const, width: 84, shadow: true },
                { id: 'body', text: body, x: 8, y: 55, fontSize: 14, color: '#cccccc', fontWeight: 'normal' as const, textAlign: 'left' as const, width: 84, shadow: false },
              ],
            },
          };
        }),
        textModelId: opts.modelId || 'gemini-2.5-flash',
        imageModelId: DEFAULT_IMAGE_MODEL,
      };
    case 'threads':
      return {
        ...base,
        posts: (parsed.posts || []).map((p: any, i: number) => ({
          id: `tp-${Date.now()}-${i}`,
          role: p.role || 'content',
          text: p.text || '',
        })),
        modelId: opts.modelId || DEFAULT_TEXT_MODEL,
      };
    case 'longform':
      return {
        ...base,
        videoTitle: parsed.videoTitle || '',
        targetDuration: opts.targetDuration || '8~12분',
        scenes: (parsed.scenes || []).map((s: any, i: number) => ({
          id: `ls-${Date.now()}-${i}`,
          sectionType: s.sectionType || 'main',
          title: s.title || '',
          narration: s.narration || '',
          direction: s.direction || '',
          imagePrompt: s.imagePrompt,
        })),
        modelId: opts.modelId || DEFAULT_TEXT_MODEL,
        imageModelId: DEFAULT_IMAGE_MODEL,
      };
    case 'shortform':
      return {
        ...base,
        targetDuration: opts.targetDuration || '30~60초',
        hook: parsed.hook || '',
        body: parsed.body || '',
        cta: parsed.cta || '',
        direction: parsed.direction || '',
        modelId: opts.modelId || DEFAULT_TEXT_MODEL,
      };
    default:
      return { ...base, ...parsed };
  }
}

// ─── Load actual source data from exam/note files ───
async function buildSourceFromContent(file: any): Promise<SourceData> {
  const c = file.content;
  const source: SourceData = { type: c.sourceType };

  if (c.sourceType === 'exam' && c.sourceId) {
    // sourceId format: "77-1" (examNumber-questionNumber)
    const [examNum, qNum] = c.sourceId.split('-');
    source.examNumber = parseInt(examNum, 10);
    source.questionNumber = parseInt(qNum, 10);

    // Load exam data from data/questions/exam-{N}.json
    const examFilePath = path.join(config.dataDir, `exam-${source.examNumber}.json`);
    try {
      const raw = await fs.readFile(examFilePath, 'utf-8');
      const examData = JSON.parse(raw) as {
        exam: any;
        questions: Array<{
          questionNumber: number;
          content: string;
          choices: string[];
          correctAnswer: number;
          explanation?: string;
          era?: string;
        }>;
      };

      const question = examData.questions.find(
        (q) => q.questionNumber === source.questionNumber,
      );
      if (question) {
        source.content = question.content;
        source.choices = question.choices;
        source.correctAnswer = question.correctAnswer;
        source.explanation = question.explanation;
        source.era = question.era;
      }
    } catch (err) {
      console.warn(
        `[buildSourceFromContent] Failed to load exam file: ${examFilePath}`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (c.sourceType === 'note' && c.sourceId) {
    // sourceId is the note sectionId, e.g. "s1-01"
    const notesDir = path.resolve(config.dataDir, '../notes');
    const noteFilePath = path.join(notesDir, `${c.sourceId}.json`);
    try {
      const raw = await fs.readFile(noteFilePath, 'utf-8');
      const noteData = JSON.parse(raw) as {
        title: string;
        content: string;
      };

      source.noteTitle = noteData.title;
      source.noteHtml = noteData.content;
    } catch (err) {
      console.warn(
        `[buildSourceFromContent] Failed to load note file: ${noteFilePath}`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return source;
}

// getChannelKey imported from content-constants.ts

function sendSSE(res: Response | undefined, data: any): void {
  if (!res) return;
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
