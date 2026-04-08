/**
 * Full coverage summary note generator.
 * 1. Re-extract missed concepts (grounding enabled)
 * 2. Polish ALL topics in batches of 25
 * 3. Merge into single styled HTML
 *
 * Usage: cd author-tool && npx tsx scripts/full-summary-note.ts --category=정보처리산업기사 --exams=5
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { generateText, parseJSON } from '../server/services/gemini.provider.js';

const CBT_DATA_DIR = path.resolve(__dirname, '../../cbt_data');
const CATEGORY = process.argv.find((a) => a.startsWith('--category='))?.split('=')[1]!;
const EXAM_COUNT = parseInt(process.argv.find((a) => a.startsWith('--exams='))?.split('=')[1] || '5');
const MODEL = process.argv.find((a) => a.startsWith('--model='))?.split('=')[1] || 'gemini-2.5-flash';
const BATCH_SIZE = 5;
const POLISH_BATCH = 25;

if (!CATEGORY) { console.error('--category required'); process.exit(1); }

// ─── Types ───
interface Concept { question_index: number; topic: string; subtopic: string; concept: string; key_terms: string[]; }
interface TopicGroup { topic: string; frequency: number; allTerms: string[]; subtopics: { subtopic: string; frequency: number; concepts: string[] }[]; }

// ─── Step 1: Load all questions ───
async function loadQuestions(): Promise<any[]> {
  const catFile = path.join(CBT_DATA_DIR, 'json', CATEGORY.replace(/ /g, '_') + '.json');
  const data = JSON.parse(await fs.readFile(catFile, 'utf-8'));
  const exams = data.exams.slice(0, EXAM_COUNT);
  const all: any[] = [];
  for (const exam of exams) {
    const examFile = path.join(CBT_DATA_DIR, 'json', 'exams', `${exam.exam_id}.json`);
    try {
      const ed = JSON.parse(await fs.readFile(examFile, 'utf-8'));
      all.push(...ed.questions);
    } catch { all.push(...(exam.questions || [])); }
  }
  return all;
}

// ─── Step 2: Extract concepts with grounding ───
async function extractAll(questions: any[]): Promise<Concept[]> {
  const concepts: Concept[] = [];
  let skipped = 0;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    process.stdout.write(`\r  개념 추출: ${Math.min(i + BATCH_SIZE, questions.length)}/${questions.length}`);

    const text = batch.map((q: any, idx: number) => {
      const choices = q.choices.map((c: any) => `${c.number}. ${c.text}${c.is_correct ? ' [정답]' : ''}`).join('\n');
      return `문제 ${idx + 1}:\n${q.text}\n${choices}${q.explanation ? `\n해설: ${q.explanation}` : ''}`;
    }).join('\n\n---\n\n');

    const prompt = `자격시험 기본서 저자로서, 아래 문제들의 핵심 개념을 추출하세요.
각 문제마다 topic(교과서 챕터 수준), subtopic, concept(교과서급 3-5문장 설명), key_terms를 JSON으로 응답.
부족한 정보는 당신의 지식과 웹 검색 결과로 보충하여 충실한 교과서 설명을 작성하세요.

[{"question_index":1,"topic":"주제","subtopic":"세부주제","concept":"상세 설명","key_terms":["용어"]}]

${text}`;

    try {
      const raw = await generateText(prompt, MODEL, { grounding: true });
      const parsed = parseJSON<Concept[]>(raw, '추출');
      concepts.push(...parsed);
    } catch { skipped++; }

    if (i + BATCH_SIZE < questions.length) await new Promise((r) => setTimeout(r, 1200));
  }
  console.log(`\n  → ${concepts.length}개 개념 (${skipped}개 스킵)\n`);
  return concepts;
}

// ─── Step 3: Group ───
function mergeConcepts(concepts: Concept[]): TopicGroup[] {
  const map = new Map<string, { topic: string; freq: number; terms: Set<string>; subs: Map<string, { sub: string; freq: number; concepts: string[] }> }>();
  for (const c of concepts) {
    if (!map.has(c.topic)) map.set(c.topic, { topic: c.topic, freq: 0, terms: new Set(), subs: new Map() });
    const g = map.get(c.topic)!;
    g.freq++;
    c.key_terms.forEach((t) => g.terms.add(t));
    if (!g.subs.has(c.subtopic)) g.subs.set(c.subtopic, { sub: c.subtopic, freq: 0, concepts: [] });
    const s = g.subs.get(c.subtopic)!;
    s.freq++; s.concepts.push(c.concept);
  }
  return Array.from(map.values())
    .sort((a, b) => b.freq - a.freq)
    .map((g) => ({
      topic: g.topic, frequency: g.freq, allTerms: Array.from(g.terms),
      subtopics: Array.from(g.subs.values()).sort((a, b) => b.freq - a.freq).map((s) => ({
        subtopic: s.sub, frequency: s.freq, concepts: s.concepts,
      })),
    }));
}

// ─── Step 4: Polish ALL topics in batches ───
async function polishAll(topics: TopicGroup[]): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < topics.length; i += POLISH_BATCH) {
    const batch = topics.slice(i, i + POLISH_BATCH);
    const batchNum = Math.floor(i / POLISH_BATCH) + 1;
    const totalBatches = Math.ceil(topics.length / POLISH_BATCH);
    console.log(`  polish ${batchNum}/${totalBatches} (주제 ${i + 1}~${Math.min(i + POLISH_BATCH, topics.length)})...`);

    const data = batch.map((t) => ({
      topic: t.topic, frequency: t.frequency, key_terms: t.allTerms.slice(0, 10),
      subtopics: t.subtopics.slice(0, 6).map((s) => ({
        subtopic: s.subtopic, frequency: s.frequency,
        concept: s.concepts.sort((a, b) => b.length - a.length)[0]?.slice(0, 500),
      })),
    }));

    const prompt = `${CATEGORY} 자격시험 기본서 저자로서, 아래 기출 주제를 교과서급 HTML 요약노트로 작성하세요.

규칙:
- 교과서 문체 (~이다, ~한다). "이 문제에서는..." 금지
- 정보가 부족하면 당신의 지식과 웹 검색으로 보충하여 충실하게 작성
- 각 세부주제 최소 200자, 핵심 주제는 500자 이상
- 정의, 원리, 예시, 비교표, 공식을 풍부하게 포함
- 줄바꿈과 구조화 (p, ul/ol, table) 적극 활용

HTML 태그:
- <details open><summary><strong>이모지 주제 (출제 N회)</strong></summary>
- <details class="sub-details"><summary><strong>세부주제</strong></summary>
- <span class="highlight">핵심용어</span>, <span class="keyword">키워드</span>
- <div class="note">💡 팁</div>, <table>

${JSON.stringify(data)}`;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const html = await generateText(prompt, MODEL, { grounding: true });
        results.push(html);
        break;
      } catch (err: any) {
        if (attempt === 3) {
          console.error(`    ❌ batch ${batchNum} 실패: ${err.message}`);
          // Fallback: quick mode
          results.push(quickHtml(batch));
        } else {
          console.warn(`    ⚠️ retry ${attempt}/3...`);
          await new Promise((r) => setTimeout(r, 3000 * attempt));
        }
      }
    }
    if (i + POLISH_BATCH < topics.length) await new Promise((r) => setTimeout(r, 2000));
  }
  return results;
}

function quickHtml(topics: TopicGroup[]): string {
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

// ─── Step 5: Wrap with CSS ───
function wrapHtml(body: string, questionCount: number, topicCount: number): string {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${CATEGORY} 핵심 요약노트</title>
<style>
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
</style></head><body><div class="container">
<h1>📚 ${CATEGORY} 핵심 요약노트</h1>
<p class="subtitle">기출문제 ${questionCount}문제 완전 분석 · ${topicCount}개 주제 · 출제 빈도순 · Google Search 보강</p>
<hr>
${body}
</div></body></html>`;
}

// ─── Main ───
async function main() {
  console.log(`\n📖 ${CATEGORY} 완전판 요약노트 생성`);
  console.log(`  시험: ${EXAM_COUNT}개, 모델: ${MODEL}\n`);
  const start = Date.now();

  // Step 1
  const questions = await loadQuestions();
  console.log(`📚 ${questions.length}문제 로드\n`);

  // Step 2: Check if concepts already exist
  const conceptsPath = path.join(CBT_DATA_DIR, 'summary_notes', `${CATEGORY}_concepts_full.json`);
  let concepts: Concept[];
  try {
    concepts = JSON.parse(await fs.readFile(conceptsPath, 'utf-8'));
    console.log(`📂 기존 개념 로드: ${concepts.length}개\n`);
  } catch {
    concepts = await extractAll(questions);
    await fs.mkdir(path.dirname(conceptsPath), { recursive: true });
    await fs.writeFile(conceptsPath, JSON.stringify(concepts, null, 2), 'utf-8');
    console.log(`💾 개념 저장: ${concepts.length}개\n`);
  }

  // Step 3
  const topics = mergeConcepts(concepts);
  console.log(`📊 ${topics.length}개 주제\n`);

  // Step 4: Polish ALL
  console.log(`✨ 전체 polish 시작 (${Math.ceil(topics.length / POLISH_BATCH)}배치)...\n`);
  const htmlParts = await polishAll(topics);

  // Step 5: Merge & wrap
  const body = htmlParts.join('\n\n<hr>\n\n');
  const fullHtml = wrapHtml(body, questions.length, topics.length);

  const outPath = path.join(CBT_DATA_DIR, 'summary_notes', `${CATEGORY}_full.html`);
  await fs.writeFile(outPath, fullHtml, 'utf-8');

  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
  console.log(`\n✅ 완료! (${elapsed}분)`);
  console.log(`  문제: ${questions.length}, 개념: ${concepts.length}, 주제: ${topics.length}`);
  console.log(`  HTML: ${outPath} (${(fullHtml.length / 1024).toFixed(0)}KB)`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
