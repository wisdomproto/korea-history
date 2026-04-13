/**
 * Gemma-only summary note generator for Korean history exams.
 * Both concept extraction and polish run on the local Gemma gateway.
 *
 * Usage:
 *   cd author-tool
 *   npx tsx scripts/gemma-summary-korea.ts --from=73 --to=77
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { generate as gemmaGenerate } from '../server/services/gemma-client.js';

const DATA_DIR = path.resolve(__dirname, '../../data/questions');
const OUT_DIR = path.resolve(__dirname, '../../data/summary-notes-gemma-test');

const FROM = parseInt(process.argv.find((a) => a.startsWith('--from='))?.split('=')[1] || '73');
const TO = parseInt(process.argv.find((a) => a.startsWith('--to='))?.split('=')[1] || '77');
const EXTRACT_BATCH = 3;
const POLISH_BATCH = 1; // topic 단위 독립 polish — 컨텍스트 집중 + 구조 준수

interface KQuestion {
  id: number;
  examId: number;
  content: string;
  choices: string[];
  correctAnswer: number;
  era?: string;
  category?: string;
  keywords?: string[];
  explanation?: string;
}

interface Concept {
  question_index: number;
  topic: string;
  subtopic: string;
  concept: string;
  key_terms: string[];
}

interface TopicGroup {
  topic: string;
  frequency: number;
  allTerms: string[];
  subtopics: { subtopic: string; frequency: number; concepts: string[] }[];
}

function parseJsonArray<T>(raw: string): T[] {
  let s = (raw || '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('no JSON array in response');
  return JSON.parse(s.slice(start, end + 1));
}

async function loadQuestions(from: number, to: number): Promise<KQuestion[]> {
  const all: KQuestion[] = [];
  for (let n = from; n <= to; n++) {
    const file = path.join(DATA_DIR, `exam-${n}.json`);
    const data = JSON.parse(await fs.readFile(file, 'utf-8'));
    for (const q of data.questions) all.push(q);
  }
  return all;
}

async function extractAll(questions: KQuestion[]): Promise<Concept[]> {
  const concepts: Concept[] = [];
  let skipped = 0;
  const start = Date.now();

  for (let i = 0; i < questions.length; i += EXTRACT_BATCH) {
    const batch = questions.slice(i, i + EXTRACT_BATCH);
    const done = Math.min(i + EXTRACT_BATCH, questions.length);
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    process.stdout.write(`\r  개념 추출: ${done}/${questions.length} (${elapsed}s)`);

    const body = batch.map((q, idx) => {
      const choices = q.choices.map((c, ci) => `${ci + 1}. ${c}${q.correctAnswer === ci + 1 ? ' [정답]' : ''}`).join('\n');
      const meta = [q.era && `시대: ${q.era}`, q.category && `분류: ${q.category}`].filter(Boolean).join(' / ');
      return `문제 ${idx + 1}${meta ? ` (${meta})` : ''}:\n${q.content}\n${choices}${q.explanation ? `\n해설: ${q.explanation}` : ''}`;
    }).join('\n\n---\n\n');

    const prompt = `아래 한국사 능력검정시험 문제들에서 핵심 개념을 추출해 JSON 배열로만 응답하세요.

규칙(엄수):
- 응답은 JSON 배열(\`[ ... ]\`) 하나만. 설명/머리말/마크다운 금지.
- 각 객체: question_index(number, 1부터), topic(string, 한국사 교과서 단원 수준: "삼국의 성립과 발전" 등), subtopic(string, 세부 주제: "신라의 삼국 통일" 등), concept(string, 한국어 3~5문장의 교과서급 설명), key_terms(string 배열, 핵심 용어 3~7개).
- concept는 문제 맥락이 아니라 역사적 사실/개념 설명.

예시:
[{"question_index":1,"topic":"선사시대와 고조선","subtopic":"청동기시대","concept":"청동기시대에는 계급이 발생하고 사유재산이 생겨났다. 대표적 유물로 비파형동검, 반달돌칼이 있으며 지배층의 무덤인 고인돌이 축조되었다. 벼농사가 본격화되었다.","key_terms":["비파형동검","고인돌","반달돌칼","사유재산","계급"]}]

문제:
${body}`;

    try {
      const raw = await gemmaGenerate(prompt, { temperature: 0.3, maxTokens: 4096, timeoutMs: 180_000 });
      const parsed = parseJsonArray<Concept>(raw);
      // Map question_index back to absolute question number within this run
      for (const c of parsed) {
        const rel = Math.max(1, Math.min(batch.length, Number(c.question_index) || 1));
        concepts.push({ ...c, question_index: i + rel });
      }
    } catch (e: any) {
      skipped++;
      console.warn(`\n    ⚠️ batch ${i / EXTRACT_BATCH + 1} 실패: ${e.message}`);
    }
  }
  console.log(`\n  → ${concepts.length}개 개념 추출 (${skipped}개 배치 스킵)\n`);
  return concepts;
}

// 한자 제거 (CJK Unified Ideographs)
function stripHanja(s: string): string {
  return (s || '')
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF]+/g, '')
    .replace(/\(\s*[,，\s\-]*\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 한국사 시대 정규화 — 유사 topic을 하나의 시대로 병합
function canonicalEra(rawTopic: string): string {
  const topic = stripHanja(rawTopic);
  if (/선사|구석기|신석기|청동기|철기|고조선|위만/.test(topic)) return '선사·고조선';
  if (/부여|삼한|옥저|동예|초기\s*국가/.test(topic)) return '초기 국가';
  if (/통일\s*신라|남북국|발해/.test(topic)) return '남북국 시대';
  if (/후삼국/.test(topic)) return '후삼국 시대';
  if (/삼국|고구려|백제(?!.*근대)|신라/.test(topic) && !/통일/.test(topic)) return '삼국 시대';
  if (/고려/.test(topic)) return '고려 시대';
  if (/조선\s*전기|조선\s*초기/.test(topic)) return '조선 전기';
  if (/조선\s*후기|조선\s*중기|실학|세도/.test(topic)) return '조선 후기';
  if (/조선/.test(topic)) return '조선 시대';
  if (/일제|식민|강점|독립운동|3\.?1|의열단|임시정부/.test(topic)) return '일제강점기';
  if (/근현대/.test(topic)) return '근현대사';
  if (/개항|개화|강화도|대한제국|갑신|갑오|을미|근대/.test(topic)) return '개항·근대사';
  if (/현대|해방|대한민국|6\.?25|한국전쟁|유신|민주화/.test(topic)) return '현대사';
  return topic || '기타';
}

// 시대 정규화 이름으로부터 순서 랭크
function eraRank(canonical: string): number {
  const map: Record<string, number> = {
    '선사·고조선': 10,
    '초기 국가': 20,
    '삼국 시대': 30,
    '남북국 시대': 40,
    '후삼국 시대': 50,
    '고려 시대': 60,
    '조선 전기': 70,
    '조선 시대': 75,
    '조선 후기': 80,
    '개항·근대사': 90,
    '일제강점기': 100,
    '근현대사': 110,
    '현대사': 120,
  };
  return map[canonical] ?? 999;
}

function mergeConcepts(concepts: Concept[]): TopicGroup[] {
  const map = new Map<string, { topic: string; freq: number; terms: Set<string>; subs: Map<string, { sub: string; freq: number; concepts: string[] }> }>();
  for (const c of concepts) {
    const rawTopic = (c.topic ?? '').trim();
    const topic = canonicalEra(rawTopic); // 시대명 정규화로 병합
    const subtopic = stripHanja(c.subtopic ?? '').trim() || '기타';
    const concept = stripHanja(c.concept ?? '').trim();
    const keyTerms = Array.isArray(c.key_terms) ? c.key_terms.map((t) => stripHanja(t)).filter(Boolean) : [];
    if (!concept) continue;
    if (!map.has(topic)) map.set(topic, { topic, freq: 0, terms: new Set(), subs: new Map() });
    const g = map.get(topic)!;
    g.freq++;
    for (const t of keyTerms) if (typeof t === 'string' && t.trim()) g.terms.add(t.trim());
    if (!g.subs.has(subtopic)) g.subs.set(subtopic, { sub: subtopic, freq: 0, concepts: [] });
    const s = g.subs.get(subtopic)!;
    s.freq++;
    s.concepts.push(concept);
  }
  return Array.from(map.values())
    .sort((a, b) => eraRank(a.topic) - eraRank(b.topic))
    .map((g) => ({
      topic: g.topic,
      frequency: g.freq,
      allTerms: Array.from(g.terms),
      subtopics: Array.from(g.subs.values())
        .sort((a, b) => b.freq - a.freq)
        .map((s) => ({ subtopic: s.sub, frequency: s.freq, concepts: s.concepts })),
    }));
}

async function polishAll(topics: TopicGroup[]): Promise<string[]> {
  const results: string[] = [];
  const start = Date.now();

  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    console.log(`  polish ${i + 1}/${topics.length} — "${t.topic}" (출제 ${t.frequency}회, ${elapsed}s)...`);

    const html = await polishOne(t);
    results.push(stripCodeFence(html));
  }
  return results;
}

async function polishOne(t: TopicGroup): Promise<string> {
  // 최대 25개 subtopic까지 전달 (병합 후에도 모든 세부주제가 반영되도록)
  const subLines = t.subtopics.slice(0, 25).map((s, idx) => {
    const bestConcept = s.concepts.sort((a, b) => b.length - a.length)[0]?.slice(0, 500) || '';
    return `세부주제 ${idx + 1}: ${s.subtopic} (출제 ${s.frequency}회)\n  기출 개념: ${bestConcept}`;
  }).join('\n\n');

  const keyTerms = t.allTerms.slice(0, 25).join(', ');

  const prompt = `당신은 한국사능력검정시험 기본서 저자입니다. 아래 **단 하나의 주제**에 대해 교과서급 HTML 요약노트를 작성하세요.

# 주제 정보
- 주제명: ${t.topic}
- 기출 빈도: ${t.frequency}회
- 핵심 용어: ${keyTerms}

# 기출 세부주제와 개념 (${t.subtopics.length}개)
${subLines}

# 작성 규칙 (엄수)
1. 출력은 오직 **<details open>...</details>** 블록 하나. 다른 태그(<h1><h2><h3>) 금지.
2. 메타 서술 금지: "정리해보겠습니다", "이러한 내용들을 통해", "위 정보를 바탕으로" 등 금지. 바로 HTML 시작.
3. 교과서 문체: "~이다", "~하였다", "~이었다". 해설 말투("~문제에서는") 금지.
4. **입력된 세부주제를 빠짐없이 각각 별도의 <details class="sub-details"> 블록으로 출력하세요.** 유사 주제라도 통합하지 말고 개별 블록으로 작성. 세부주제 개수가 많을수록 더 풍부한 노트가 됩니다.
5. 각 <details class="sub-details"> 블록의 <p>는 **최소 300자**. 정의→배경→전개→영향 흐름. 부족하면 당신의 한국사 지식으로 충실히 보강.
6. <span class="highlight">핵심 문장</span>, <span class="keyword">핵심 용어</span>를 충분히 활용.
7. 마크다운 금지(**, ##, ---). HTML 태그만 사용.
8. **한자 사용 금지**: 한자(漢字) 일체 사용 금지. 모든 용어는 한글로만 표기. 병기도 금지.
9. **플레이스홀더 금지**: "(본문)", "(300자+)", "(항목1)" 같은 괄호 안 안내 문구를 출력에 그대로 포함하지 말 것. 반드시 실제 내용으로 채울 것.
10. <p> 태그 안에서 본문은 괄호 "(" 로 시작하지 말 것. 바로 본문 문장으로 시작.

# 출력 형식 (이 예시의 구조를 정확히 따를 것)

<details open><summary><strong>📜 ${t.topic} (출제 ${t.frequency}회)</strong></summary>
<div class="note">💡 핵심: (3문장으로 주제의 전체 맥락과 시험 포인트 요약)</div>
<ul>
  <li>(핵심 포인트 1)</li>
  <li>(핵심 포인트 2)</li>
  <li>(핵심 포인트 3)</li>
  <li>(핵심 포인트 4)</li>
  <li>(핵심 포인트 5)</li>
</ul>
<details class="sub-details"><summary><strong>(세부주제 1 이름)</strong></summary>
<p>(300자 이상의 교과서 설명. <span class="keyword">핵심용어</span>를 본문에 녹여쓰기. <span class="highlight">중요 문장 강조</span>.)</p>
</details>
<details class="sub-details"><summary><strong>(세부주제 2 이름)</strong></summary>
<p>(300자 이상)</p>
</details>
<details class="sub-details"><summary><strong>(세부주제 3 이름)</strong></summary>
<p>(300자 이상)</p>
</details>
<table>
<thead><tr><th>구분</th><th>내용</th></tr></thead>
<tbody>
<tr><td>(항목1)</td><td>(설명)</td></tr>
<tr><td>(항목2)</td><td>(설명)</td></tr>
</tbody>
</table>
</details>

이제 "${t.topic}" 주제에 대한 HTML을 위 형식 그대로 출력하세요. HTML만 출력, 다른 설명 없이.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const html = await gemmaGenerate(prompt, { temperature: 0.3, maxTokens: 16000, timeoutMs: 900_000 });
      return html;
    } catch (err: any) {
      if (attempt === 3) {
        console.error(`    ❌ "${t.topic}" 실패: ${err.message} — fallback`);
        return quickHtml([t]);
      }
      console.warn(`    ⚠️ retry ${attempt}/3...`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  return quickHtml([t]);
}

function stripCodeFence(s: string): string {
  return (s || '').trim().replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
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

function mdToHtml(s: string): string {
  let out = s;
  out = out.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
  out = out.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
  out = out.replace(/^#{1}\s+(.+)$/gm, '<h2>$1</h2>');
  out = out.replace(/^\s*(\*\*\*|---)\s*$/gm, '<hr>');
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  // <p>가 "(" 로 시작하고 ")" 로 끝나면 괄호 제거 (플레이스홀더 잔재)
  out = out.replace(/<p>\(([^<]*?)\)<\/p>/g, '<p>$1</p>');
  // 한자 전수 제거 (병기/단독 모두)
  out = out.replace(/[\u4E00-\u9FFF\u3400-\u4DBF]+/g, '');
  // 빈 괄호 정리 (공백, 숫자, 쉼표, 하이픈만 남은 경우)
  out = out.replace(/\(\s*[,，\s\-]*\s*\)/g, '');
  // 한자 제거 후 남은 이중 공백 정리
  out = out.replace(/[ \t]{2,}/g, ' ');
  return out;
}

function wrapHtml(body: string, questionCount: number, topicCount: number, range: string): string {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>한국사능력검정시험 요약노트 (Gemma-only test) ${range}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard",sans-serif;background:linear-gradient(135deg,#E8D5F2,#B8E6E1,#A8E6CF);min-height:100vh;padding:2rem 1rem;color:#333;line-height:1.8}
.container{max-width:860px;margin:0 auto;background:rgba(255,255,255,.95);border-radius:20px;padding:2.5rem;box-shadow:0 8px 32px rgba(0,0,0,.1)}
h1{font-size:1.8rem;font-weight:700;text-align:center;margin-bottom:.5rem;color:#2d3748}
h2{font-size:1.3rem;font-weight:700;margin:1.5rem 0 .75rem;color:#2d3748;border-bottom:2px solid #CBD5E0;padding-bottom:.25rem}
h3{font-size:1.05rem;font-weight:600;margin:1rem 0 .5rem;color:#4a5568}
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
<h1>📚 한국사능력검정시험 요약노트 — Gemma 테스트</h1>
<p class="subtitle">시험 ${range} · ${questionCount}문제 · ${topicCount}개 주제 · 출제 빈도순</p>
<hr>
${body}
</div></body></html>`;
}

async function main() {
  const range = `${FROM}~${TO}회`;
  console.log(`\n📖 한국사 ${range} Gemma-only 요약노트 생성\n`);
  const start = Date.now();

  const questions = await loadQuestions(FROM, TO);
  console.log(`📚 ${questions.length}문제 로드 (${TO - FROM + 1}회분)\n`);

  await fs.mkdir(OUT_DIR, { recursive: true });

  // Stage 1: extract (with cache)
  const conceptsPath = path.join(OUT_DIR, `korea-${FROM}-${TO}-concepts.json`);
  let concepts: Concept[];
  const extractStart = Date.now();
  try {
    concepts = JSON.parse(await fs.readFile(conceptsPath, 'utf-8'));
    console.log(`📂 기존 개념 캐시 로드: ${concepts.length}개\n`);
  } catch {
    console.log(`🔍 개념 추출 시작 (배치 ${EXTRACT_BATCH}문제씩, Gemma)...`);
    concepts = await extractAll(questions);
    await fs.writeFile(conceptsPath, JSON.stringify(concepts, null, 2), 'utf-8');
  }
  const extractSec = ((Date.now() - extractStart) / 1000).toFixed(0);

  // Stage 2: group
  const topics = mergeConcepts(concepts);
  console.log(`📊 ${topics.length}개 주제로 그룹핑\n`);

  // Stage 3: polish
  const polishStart = Date.now();
  console.log(`✨ Polish 시작 (${Math.ceil(topics.length / POLISH_BATCH)}배치, Gemma)...\n`);
  const htmlParts = await polishAll(topics);
  const polishSec = ((Date.now() - polishStart) / 1000).toFixed(0);

  // Stage 4: wrap
  const body = mdToHtml(htmlParts.join('\n\n<hr>\n\n'));
  const fullHtml = wrapHtml(body, questions.length, topics.length, range);

  const outPath = path.join(OUT_DIR, `korea-${FROM}-${TO}.html`);
  await fs.writeFile(outPath, fullHtml, 'utf-8');

  const totalSec = ((Date.now() - start) / 1000).toFixed(0);
  const totalMin = (Number(totalSec) / 60).toFixed(1);

  console.log(`\n✅ 완료 (총 ${totalMin}분 = ${totalSec}초)`);
  console.log(`  추출: ${extractSec}초 / Polish: ${polishSec}초`);
  console.log(`  문제: ${questions.length}, 개념: ${concepts.length}, 주제: ${topics.length}`);
  console.log(`  HTML: ${outPath} (${(fullHtml.length / 1024).toFixed(0)}KB)`);
  console.log(`  개념 캐시: ${conceptsPath}\n`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
