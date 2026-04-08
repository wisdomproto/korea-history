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

interface SerializableTopicGroup {
  topic: string;
  frequency: number;
  allTerms: string[];
  subtopics: { subtopic: string; frequency: number; concepts: string[] }[];
}

// --- Constants ---

const BATCH_SIZE = 5;
const POLISH_BATCH = 25;
const activeJobs = new Set<string>();

// --- CSS for styled HTML ---

const HTML_CSS = `<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard",sans-serif;background:linear-gradient(135deg,#E8D5F2,#B8E6E1,#A8E6CF);min-height:100vh;padding:2rem 1rem;color:#333;line-height:1.8}
.container{max-width:800px;margin:0 auto;background:rgba(255,255,255,.95);border-radius:20px;padding:2.5rem;box-shadow:0 8px 32px rgba(0,0,0,.1)}
h1{font-size:1.8rem;font-weight:700;text-align:center;margin-bottom:.5rem;color:#2d3748}
.subtitle{text-align:center;color:#718096;font-size:.9rem;margin-bottom:2rem}
details{margin-bottom:1rem;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0}
details>summary{padding:1rem 1.25rem;background:linear-gradient(135deg,#FFF3E0,#FFE0B2);border-left:4px solid #FF9800;cursor:pointer;font-size:1.1rem;list-style:none}
details>summary::-webkit-details-marker{display:none}
details>summary::before{content:"▸ "}details[open]>summary::before{content:"▾ "}
details>.content,details>:not(summary){padding:.75rem 1.25rem}
details.sub-details{margin:.75rem 0;border:1px solid #e8e8e8;border-radius:8px}
details.sub-details>summary{padding:.75rem 1rem;background:#f7fafc;border-left:3px solid #4299e1;font-size:.95rem}
.highlight{background:linear-gradient(to bottom,transparent 60%,#FEFCBF 60%);padding:0 2px;font-weight:600}
.keyword{color:#2b6cb0;font-weight:700;border-bottom:2px solid #bee3f8}
.note{background:#EBF8FF;border-left:4px solid #4299e1;border-radius:8px;padding:.75rem 1rem;margin:.75rem 0;font-size:.9rem;color:#2c5282}
table{width:100%;border-collapse:collapse;margin:.75rem 0;font-size:.9rem}
th{background:#edf2f7;padding:.6rem .75rem;text-align:left;border-bottom:2px solid #cbd5e0;font-weight:600}
td{padding:.5rem .75rem;border-bottom:1px solid #e2e8f0}
tr:hover td{background:#f7fafc}
p{margin:.75rem 0}ul,ol{margin:.5rem 0 .5rem 1.5rem}li{margin-bottom:.4rem}
hr{border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0}
</style>`;

// --- Main generator ---

export async function* generate(opts: GenerateOptions): AsyncGenerator<SSEEvent> {
  const { categoryCode, examIds, mode, model } = opts;

  if (activeJobs.has(categoryCode)) {
    yield { type: 'error', message: '이미 생성 중인 작업이 있습니다.' };
    return;
  }
  activeJobs.add(categoryCode);

  try {
    // Step 1: Load questions
    yield { type: 'progress', step: 'loading', message: '문제 로딩 중...' };
    const questions = await loadQuestions(categoryCode, examIds);
    const total = questions.length;
    if (total === 0) { yield { type: 'error', message: '문제가 없습니다.' }; return; }

    // Step 2: Extract concepts (with grounding)
    const allConcepts: ConceptItem[] = [];
    let skipped = 0;
    const totalBatches = Math.ceil(total / BATCH_SIZE);

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      yield { type: 'progress', step: 'extracting', current: batchNum, total: totalBatches };

      try {
        const concepts = await extractConcepts(batch, model);
        allConcepts.push(...concepts);
      } catch { skipped++; }

      if (i + BATCH_SIZE < total) await new Promise((r) => setTimeout(r, 1200));
    }

    yield { type: 'progress', step: 'extracting', current: totalBatches, total: totalBatches,
      message: `${allConcepts.length}개 개념 추출 (${skipped}개 스킵)` };

    // Step 3: Merge
    yield { type: 'progress', step: 'grouping', message: '주제 그룹핑 중...' };
    const topics = mergeConcepts(allConcepts);
    yield { type: 'progress', step: 'grouping', topicCount: topics.length };

    // Step 4: Generate HTML
    let html: string;
    if (mode === 'polish') {
      // Polish ALL topics in batches
      const polishBatches = Math.ceil(topics.length / POLISH_BATCH);
      const htmlParts: string[] = [];

      for (let i = 0; i < topics.length; i += POLISH_BATCH) {
        const batch = topics.slice(i, i + POLISH_BATCH);
        const batchNum = Math.floor(i / POLISH_BATCH) + 1;
        yield { type: 'progress', step: 'polishing', current: batchNum, total: polishBatches,
          message: `교과서 형태로 정리 중 (${batchNum}/${polishBatches})...` };

        try {
          const part = await polishBatch(batch, categoryCode, model);
          htmlParts.push(part);
        } catch {
          // Fallback to quick mode for this batch
          htmlParts.push(quickHtml(batch));
        }

        if (i + POLISH_BATCH < topics.length) await new Promise((r) => setTimeout(r, 2000));
      }

      html = wrapFullHtml(htmlParts.join('\n\n<hr>\n\n'), categoryCode, total, topics.length);
    } else {
      yield { type: 'progress', step: 'polishing', message: '빠른 모드로 생성 중...' };
      html = wrapFullHtml(quickHtml(topics), categoryCode, total, topics.length);
    }

    // Step 5: Save
    yield { type: 'progress', step: 'saving', message: '저장 중...' };
    const noteId = `sn-${Date.now()}`;
    const now = new Date().toISOString();
    const note: SummaryNote = {
      id: noteId, categoryCode,
      title: `${categoryCode} 핵심 요약노트`,
      examIds, questionCount: total, topicCount: topics.length,
      html, createdAt: now, updatedAt: now,
    };
    await saveNote(note);

    yield { type: 'complete', noteId, topicCount: topics.length };
  } finally {
    activeJobs.delete(categoryCode);
  }
}

// --- Helpers ---

async function loadQuestions(categoryCode: string, examIds: string[]): Promise<CbtQuestion[]> {
  if (examIds.length > 0) {
    const all: CbtQuestion[] = [];
    for (const id of examIds) {
      const exam = await cbtService.getExam(categoryCode, id);
      all.push(...exam.questions);
    }
    return all;
  }
  // Load first 5 exams if no specific IDs
  const manifest = await cbtService.getManifest(categoryCode);
  const examsToUse = manifest.exams.slice(0, 5);
  const all: CbtQuestion[] = [];
  for (const meta of examsToUse) {
    const exam = await cbtService.getExam(categoryCode, meta.exam_id);
    all.push(...exam.questions);
  }
  return all;
}

async function extractConcepts(questions: CbtQuestion[], model?: string): Promise<ConceptItem[]> {
  const text = questions.map((q, idx) => {
    const choices = q.choices.map((c) => `${c.number}. ${c.text}${c.is_correct ? ' [정답]' : ''}`).join('\n');
    return `문제 ${idx + 1}:\n${q.text}\n${choices}${q.explanation ? `\n해설: ${q.explanation}` : ''}`;
  }).join('\n\n---\n\n');

  const prompt = `자격시험 기본서 저자로서, 아래 문제들의 핵심 개념을 추출하세요.
각 문제마다 topic(교과서 챕터 수준), subtopic, concept(교과서급 3-5문장 설명), key_terms를 JSON으로 응답.
부족한 정보는 당신의 지식과 웹 검색 결과로 보충하여 충실한 교과서 설명을 작성하세요.

[{"question_index":1,"topic":"주제","subtopic":"세부주제","concept":"상세 설명","key_terms":["용어"]}]

${text}`;

  const raw = await generateText(prompt, model, { grounding: true });
  return parseJSON<ConceptItem[]>(raw, '개념 추출');
}

function mergeConcepts(concepts: ConceptItem[]): SerializableTopicGroup[] {
  const map = new Map<string, TopicGroup>();
  for (const c of concepts) {
    if (!map.has(c.topic)) map.set(c.topic, { topic: c.topic, frequency: 0, allTerms: new Set(), subtopics: new Map() });
    const g = map.get(c.topic)!;
    g.frequency++;
    c.key_terms?.forEach((t) => g.allTerms.add(t));
    if (!g.subtopics.has(c.subtopic)) g.subtopics.set(c.subtopic, { subtopic: c.subtopic, frequency: 0, concepts: [] });
    const s = g.subtopics.get(c.subtopic)!;
    s.frequency++;
    if (c.concept?.trim()) s.concepts.push(c.concept.trim());
  }
  return Array.from(map.values())
    .sort((a, b) => b.frequency - a.frequency)
    .map((g) => ({
      topic: g.topic, frequency: g.frequency, allTerms: Array.from(g.allTerms),
      subtopics: Array.from(g.subtopics.values()).sort((a, b) => b.frequency - a.frequency),
    }));
}

async function polishBatch(topics: SerializableTopicGroup[], categoryCode: string, model?: string): Promise<string> {
  const data = topics.map((t) => ({
    topic: t.topic, frequency: t.frequency, key_terms: t.allTerms.slice(0, 10),
    subtopics: t.subtopics.slice(0, 6).map((s) => ({
      subtopic: s.subtopic, frequency: s.frequency,
      concept: s.concepts.sort((a, b) => b.length - a.length)[0]?.slice(0, 500),
    })),
  }));

  const prompt = `${categoryCode} 자격시험 기본서 저자로서, 아래 기출 주제를 교과서급 HTML 요약노트로 작성하세요.

## 중요: 해설이 아닌 교과서 형태로 작성
- 학생이 처음 공부할 때 읽는 기본서/교과서 형태
- "이 문제에서는..." 같은 해설 문체 금지. "~이다", "~한다" 교과서 문체 사용
- 정보가 부족하면 당신의 지식과 웹 검색으로 보충하여 충실하게 작성
- 각 세부주제 최소 200자, 핵심 주제는 500자 이상
- 정의, 원리, 예시, 비교표, 공식을 풍부하게 포함

## HTML 태그
- <details open><summary><strong>이모지 주제 (출제 N회)</strong></summary>
- <details class="sub-details"><summary><strong>세부주제</strong></summary>
- <span class="highlight">핵심용어</span>, <span class="keyword">키워드</span>
- <div class="note">💡 팁</div>, <table> (thead + tbody)
- 줄바꿈과 구조화 (p, ul/ol, table) 적극 활용
- 가능한 한 길고 상세하게 작성

${JSON.stringify(data)}`;

  return await generateText(prompt, model, { grounding: true });
}

function quickHtml(topics: SerializableTopicGroup[]): string {
  let html = '';
  for (const t of topics) {
    const icon = t.frequency >= 10 ? '🔴' : t.frequency >= 5 ? '🟡' : '🟢';
    html += `<details open><summary><strong>${icon} ${t.topic} (출제 ${t.frequency}회)</strong></summary>\n`;
    html += `<div class="note">📌 ${t.allTerms.slice(0, 8).map((k) => `<span class="keyword">${k}</span>`).join(', ')}</div>\n`;
    for (const s of t.subtopics) {
      html += `<details class="sub-details"><summary><strong>${s.subtopic} (${s.frequency}회)</strong></summary>\n`;
      const best = s.concepts.sort((a, b) => b.length - a.length)[0] || '';
      html += `<p>${best}</p>\n</details>\n`;
    }
    html += `</details>\n\n`;
  }
  return html;
}

function wrapFullHtml(body: string, categoryCode: string, questionCount: number, topicCount: number): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${categoryCode} 핵심 요약노트</title>${HTML_CSS}</head><body><div class="container">
<h1>📚 ${categoryCode} 핵심 요약노트</h1>
<p class="subtitle">기출문제 ${questionCount}문제 완전 분석 · ${topicCount}개 주제 · 출제 빈도순 · Google Search 보강</p><hr>
${body}</div></body></html>`;
}
