import { generateText, parseJSON } from './gemini.provider.js';
import * as cbtService from './cbt.service.js';
import type { CbtQuestion } from './cbt.service.js';
import { saveNote } from './summary-note.service.js';
import type { SummaryNote } from './summary-note.service.js';

// --- Public types ---

export interface GenerateOptions {
  categoryCode: string;
  examIds: string[];
  mode: 'quick' | 'polish';
  model?: string;
}

export interface SSEEvent {
  type: 'progress' | 'complete' | 'error';
  step?: string;
  current?: number;
  total?: number;
  topicCount?: number;
  noteId?: string;
  message?: string;
}

// --- Internal types ---

interface ConceptItem {
  question_index: number;
  topic: string;
  subtopic: string;
  concept: string;
  key_terms: string[];
}

interface TopicGroup {
  topic: string;
  frequency: number;
  allTerms: Set<string>;
  subtopics: Map<string, { subtopic: string; frequency: number; concepts: string[] }>;
}

// --- Concurrency guard ---

const activeJobs = new Set<string>();

// --- Main generator ---

export async function* generate(opts: GenerateOptions): AsyncGenerator<SSEEvent> {
  const { categoryCode, examIds, mode, model } = opts;

  if (activeJobs.has(categoryCode)) {
    yield { type: 'error', message: `이미 '${categoryCode}' 카테고리에서 생성 중인 작업이 있습니다.` };
    return;
  }

  activeJobs.add(categoryCode);

  try {
    // Step 1: Load questions
    yield { type: 'progress', step: 'load', current: 0, total: examIds.length, message: '문제 데이터를 불러오는 중...' };
    const questions = await loadQuestions(categoryCode, examIds);
    yield { type: 'progress', step: 'load', current: examIds.length, total: examIds.length, message: `총 ${questions.length}개 문제 로드 완료` };

    // Step 2: Extract concepts in batches of 5
    const BATCH_SIZE = 5;
    const batches: CbtQuestion[][] = [];
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      batches.push(questions.slice(i, i + BATCH_SIZE));
    }

    const allConcepts: ConceptItem[] = [];
    let skippedBatches = 0;

    yield { type: 'progress', step: 'extract', current: 0, total: batches.length, message: '개념 추출 중...' };

    for (let i = 0; i < batches.length; i++) {
      try {
        const concepts = await extractConcepts(batches[i], model);
        allConcepts.push(...concepts);
      } catch (err) {
        skippedBatches++;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[summary-note-generator] Batch ${i + 1} failed, skipping: ${msg}`);
      }

      yield { type: 'progress', step: 'extract', current: i + 1, total: batches.length, message: `배치 ${i + 1}/${batches.length} 처리 완료 (${skippedBatches > 0 ? `${skippedBatches}개 실패` : '모두 성공'})` };

      // 1s delay between batches (except after the last one)
      if (i < batches.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Step 3: Merge concepts by topic
    yield { type: 'progress', step: 'merge', message: '주제별로 개념 정리 중...' };
    const topics = mergeConcepts(allConcepts);

    // Step 4: Generate markdown
    let markdown: string;
    if (mode === 'quick') {
      yield { type: 'progress', step: 'markdown', message: '마크다운 생성 중 (빠른 모드)...' };
      markdown = conceptsToMarkdown(topics, categoryCode);
    } else {
      yield { type: 'progress', step: 'markdown', message: 'AI로 마크다운 정제 중 (고품질 모드)...' };
      markdown = await polishWithAI(topics, categoryCode, model);
    }

    // Step 5: Convert markdown to HTML
    yield { type: 'progress', step: 'html', message: 'HTML로 변환 중...' };
    const html = markdownToHtml(markdown);

    // Step 6: Save note
    yield { type: 'progress', step: 'save', message: '요약노트 저장 중...' };
    const noteId = `sn-${categoryCode}-${Date.now()}`;
    const now = new Date().toISOString();
    const note: SummaryNote = {
      id: noteId,
      categoryCode,
      title: buildTitle(categoryCode, examIds),
      examIds,
      questionCount: questions.length,
      topicCount: topics.length,
      html,
      createdAt: now,
      updatedAt: now,
    };
    await saveNote(note);

    yield { type: 'complete', topicCount: topics.length, noteId, message: `요약노트 생성 완료 (${topics.length}개 주제, ${skippedBatches > 0 ? `${skippedBatches}개 배치 실패` : '전체 성공'})` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    yield { type: 'error', message };
  } finally {
    activeJobs.delete(categoryCode);
  }
}

// --- Helper functions ---

async function loadQuestions(categoryCode: string, examIds: string[]): Promise<CbtQuestion[]> {
  const all: CbtQuestion[] = [];
  for (const examId of examIds) {
    const exam = await cbtService.getExam(categoryCode, examId);
    all.push(...exam.questions);
  }
  return all;
}

async function extractConcepts(questions: CbtQuestion[], model?: string): Promise<ConceptItem[]> {
  const formatted = questions
    .map((q, idx) => {
      const correctChoice = q.choices.find((c) => c.is_correct);
      const choicesText = q.choices.map((c) => `${c.number}. ${c.text}`).join('\n');
      return `[문제 ${idx + 1}]\n${q.text}\n\n선지:\n${choicesText}\n\n정답: ${q.correct_answer}번 (${correctChoice?.text ?? ''})\n${q.explanation ? `\n해설: ${q.explanation}` : ''}`;
    })
    .join('\n\n---\n\n');

  const prompt = `당신은 자격시험 기본서 저자입니다.
아래 기출문제들을 분석하고, 각 문제를 풀기 위해 반드시 알아야 할 핵심 개념을 추출하세요.

## 규칙
1. 각 문제마다 **주제(topic)**와 **핵심 개념 설명**을 작성하세요.
2. 주제는 교과서 챕터 수준으로
3. 핵심 개념은 이 문제를 풀려면 알아야 할 기본 지식을 교과서처럼 설명
4. 왜 그 답이 맞는지 이해할 수 있는 배경 지식 제공
5. 수식이 필요하면 포함

## 출력 형식 (JSON)
[{"question_index":1,"topic":"주제명","subtopic":"세부주제","concept":"설명","key_terms":["용어1"]}]

## 문제들
${formatted}`;

  const raw = await generateText(prompt, model);
  return parseJSON<ConceptItem[]>(raw, '개념 추출 결과');
}

function mergeConcepts(concepts: ConceptItem[]): TopicGroup[] {
  const topicMap = new Map<string, TopicGroup>();

  for (const item of concepts) {
    const topicKey = item.topic.trim();
    if (!topicMap.has(topicKey)) {
      topicMap.set(topicKey, {
        topic: topicKey,
        frequency: 0,
        allTerms: new Set(),
        subtopics: new Map(),
      });
    }

    const group = topicMap.get(topicKey)!;
    group.frequency++;

    // Collect key terms
    for (const term of item.key_terms ?? []) {
      group.allTerms.add(term.trim());
    }

    // Merge subtopics
    const subtopicKey = (item.subtopic ?? '').trim() || topicKey;
    if (!group.subtopics.has(subtopicKey)) {
      group.subtopics.set(subtopicKey, {
        subtopic: subtopicKey,
        frequency: 0,
        concepts: [],
      });
    }
    const sub = group.subtopics.get(subtopicKey)!;
    sub.frequency++;
    if (item.concept?.trim()) {
      sub.concepts.push(item.concept.trim());
    }
  }

  // Sort topics by frequency descending
  return Array.from(topicMap.values()).sort((a, b) => b.frequency - a.frequency);
}

function frequencyIcon(freq: number): string {
  if (freq >= 5) return '🔥';
  if (freq >= 3) return '⭐';
  return '📌';
}

function conceptsToMarkdown(topics: TopicGroup[], categoryCode: string): string {
  const lines: string[] = [
    `# ${categoryCode} 요약노트`,
    '',
    `> 총 ${topics.length}개 주제`,
    '',
  ];

  for (const group of topics) {
    const icon = frequencyIcon(group.frequency);
    lines.push(`## ${icon} ${group.topic} (출제 ${group.frequency}회)`);
    lines.push('');

    if (group.allTerms.size > 0) {
      lines.push(`**핵심 용어**: ${Array.from(group.allTerms).join(', ')}`);
      lines.push('');
    }

    // Sort subtopics by frequency
    const sortedSubs = Array.from(group.subtopics.values()).sort((a, b) => b.frequency - a.frequency);
    for (const sub of sortedSubs) {
      if (sub.subtopic !== group.topic) {
        lines.push(`### ${sub.subtopic}`);
        lines.push('');
      }
      // Deduplicate concepts (keep first occurrence of similar ones)
      const seen = new Set<string>();
      for (const concept of sub.concepts) {
        const key = concept.slice(0, 40);
        if (!seen.has(key)) {
          seen.add(key);
          lines.push(concept);
          lines.push('');
        }
      }
    }
  }

  return lines.join('\n');
}

async function polishWithAI(topics: TopicGroup[], categoryCode: string, model?: string): Promise<string> {
  // Build a compact representation of merged topics to pass to AI
  const topicSummary = topics
    .map((g) => {
      const subs = Array.from(g.subtopics.values())
        .sort((a, b) => b.frequency - a.frequency)
        .map((s) => `  - ${s.subtopic}: ${s.concepts.slice(0, 2).join(' / ')}`)
        .join('\n');
      return `[${g.topic}] (빈도: ${g.frequency})\n핵심용어: ${Array.from(g.allTerms).join(', ')}\n${subs}`;
    })
    .join('\n\n');

  const prompt = `당신은 자격시험 기본서 저자입니다.
아래 기출문제 분석 결과를 바탕으로 학습자가 시험을 준비할 수 있는 **깔끔하고 체계적인 요약노트**를 마크다운으로 작성하세요.

## 작성 규칙
1. 제목: # ${categoryCode} 핵심 요약노트
2. 빈도가 높은 주제는 더 자세히, 낮은 주제는 간결하게
3. 각 주제마다 핵심 개념을 교과서처럼 서술형으로 정리
4. 중요 용어는 **굵게** 표시
5. 이해를 돕는 예시나 구조화된 설명 포함
6. 마크다운 형식 (##, ###, -, **, > 등 활용)

## 주제 분석 결과
${topicSummary}`;

  const raw = await generateText(prompt, model);

  // Strip code fences if present
  const stripped = raw.replace(/^```(?:markdown)?\s*/i, '').replace(/\s*```\s*$/, '');
  return stripped.trim();
}

function markdownToHtml(md: string): string {
  let html = md
    // Escape HTML entities first (basic safety)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

    // H1
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // H2
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // H3
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')

    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')

    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')

    // Horizontal rules
    .replace(/^---$/gm, '<hr>')

    // Blank lines → paragraph breaks (two+ newlines)
    .replace(/\n{2,}/g, '\n\n');

  // Wrap consecutive <li> items in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul>\n${match}</ul>\n`);

  // Wrap remaining plain text lines in <p> (lines not already wrapped in a block tag)
  html = html
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|li|blockquote|hr|p)[\s>]/.test(trimmed)) return line;
      if (/<\/(h[1-6]|ul|ol|li|blockquote|p)>$/.test(trimmed)) return line;
      return `<p>${trimmed}</p>`;
    })
    .join('\n');

  return html;
}

function buildTitle(categoryCode: string, examIds: string[]): string {
  if (examIds.length === 1) {
    return `${categoryCode} 요약노트 (${examIds[0]})`;
  }
  return `${categoryCode} 요약노트 (${examIds.length}개 시험)`;
}
