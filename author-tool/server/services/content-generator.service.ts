// author-tool/server/services/content-generator.service.ts
import fs from 'fs/promises';
import path from 'path';
import type { Response } from 'express';
import { generateText, parseJSON } from './gemini.provider.js';
import * as prompts from './prompt-builder.js';
import type { SourceData } from './prompt-builder.js';
import { readContentFile, writeContentFile } from './content.service.js';
import { AppError } from '../middleware.js';
import { config } from '../config.js';

interface GenerateOptions {
  contentId: string;
  channel: string;
  modelId?: string;
  targetDuration?: string;
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
  res?: Response,
): Promise<any> {
  const file = await getSourceData(contentId);
  const source = await buildSourceFromContent(file);

  sendSSE(res, { type: 'chunk', content: '기본글 생성 중...' });

  const prompt = prompts.buildBaseArticlePrompt(source);
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
      break;
    case 'instagram':
      prompt = prompts.buildCardNewsPrompt(baseHtml, source);
      break;
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

  // Save to file
  const channelKey = getChannelKey(opts.channel);
  if (channelKey) {
    (file as any)[channelKey].push(channelContent);
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
        modelId: opts.modelId || 'gemini-2.5-flash',
      };
    case 'instagram':
      return {
        ...base,
        caption: parsed.caption || '',
        hashtags: parsed.hashtags || [],
        slides: (parsed.slides || []).map((s: any, i: number) => ({
          id: `is-${Date.now()}-${i}`,
          type: s.type || 'content',
          textOverlay: s.textOverlay || '',
          imagePrompt: s.imagePrompt,
          backgroundColor: s.backgroundColor,
        })),
        textModelId: opts.modelId || 'gemini-2.5-flash',
        imageModelId: 'gemini-2.5-flash-image',
      };
    case 'threads':
      return {
        ...base,
        posts: (parsed.posts || []).map((p: any, i: number) => ({
          id: `tp-${Date.now()}-${i}`,
          role: p.role || 'content',
          text: p.text || '',
        })),
        modelId: opts.modelId || 'gemini-2.5-flash',
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
        modelId: opts.modelId || 'gemini-2.5-flash',
        imageModelId: 'gemini-2.5-flash-image',
      };
    case 'shortform':
      return {
        ...base,
        targetDuration: opts.targetDuration || '30~60초',
        hook: parsed.hook || '',
        body: parsed.body || '',
        cta: parsed.cta || '',
        direction: parsed.direction || '',
        modelId: opts.modelId || 'gemini-2.5-flash',
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

function getChannelKey(channel: string): string | null {
  const map: Record<string, string> = {
    blog: 'blog',
    instagram: 'instagram',
    threads: 'threads',
    longform: 'longForm',
    shortform: 'shortForm',
  };
  return map[channel] ?? null;
}

function sendSSE(res: Response | undefined, data: any): void {
  if (!res) return;
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
