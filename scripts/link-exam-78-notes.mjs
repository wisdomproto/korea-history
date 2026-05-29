/**
 * One-time fix: 78회 was added after the keyword pipeline last ran, so
 *   - exam-78.json questions have no `keywords`
 *   - keywords.json has no 78회 entries
 *   - every note's `relatedQuestionIds` tops out at 77050
 * => 78회 question pages show no "관련 요약노트" box.
 *
 * This script (idempotent): extract keywords for 78회 via Gemini, merge into
 * keywords.json, write back into exam-78.json, then append matching 78회 ids
 * to each note's relatedQuestionIds by note.relatedKeywords ∩ question.keywords
 * (the original linkage rule). Generalizable: pass another exam number as argv.
 *
 * Usage: node scripts/link-exam-78-notes.mjs [examNumber=78]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const Q_DIR = path.join(ROOT, "data", "questions");
const NOTES_DIR = path.join(ROOT, "data", "notes");
const EXAM_NUM = Number(process.argv[2] || 78);

// --- env (author-tool/.env) ---
const envPath = path.join(ROOT, "author-tool", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not found in author-tool/.env");
  process.exit(1);
}
const require = createRequire(path.join(ROOT, "author-tool", "package.json"));
const { GoogleGenerativeAI } = require("@google/generative-ai");
const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
  model: "gemini-2.5-flash",
});

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf-8"));
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2), "utf-8");

async function extractKeywords(questions) {
  const BATCH = 10;
  const byId = {};
  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH);
    const info = batch.map((q) => ({
      id: q.id,
      content: q.content,
      choices: (q.choices || []).join(" / "),
      era: q.era,
    }));
    const prompt = `다음은 한국사능력검정시험 문제들입니다. 각 문제에서 핵심 키워드를 2~5개 추출해주세요.
키워드는 역사적 인물, 사건, 제도, 문화재, 조약, 단체 등 고유명사 위주로 추출하세요.
일반적인 단어(예: "설명", "옳은 것", "다음")는 제외하세요.

JSON 형식으로 응답해주세요:
{"results": [{"id": 문제ID, "keywords": ["키워드1", "키워드2", ...]}, ...]}

문제 목록:
${JSON.stringify(info, null, 2)}`;
    try {
      const res = await model.generateContent(prompt);
      const m = res.response.text().match(/\{[\s\S]*\}/);
      if (!m) {
        console.warn(`  batch ${i}: no JSON`);
        continue;
      }
      const parsed = JSON.parse(m[0]);
      for (const r of parsed.results || []) byId[r.id] = r.keywords || [];
      console.log(`  batch ${i + 1}-${Math.min(i + BATCH, questions.length)}: ${(parsed.results || []).length} ok`);
    } catch (e) {
      console.error(`  batch ${i}: error`, e.message);
    }
    if (i + BATCH < questions.length) await new Promise((r) => setTimeout(r, 1000));
  }
  return byId;
}

async function main() {
  const examPath = path.join(Q_DIR, `exam-${EXAM_NUM}.json`);
  const exam = readJson(examPath);
  const questions = exam.questions;
  console.log(`exam ${EXAM_NUM}: ${questions.length} questions`);

  // 1. keywords (skip ones already present, idempotent)
  const need = questions.filter((q) => !q.keywords || q.keywords.length === 0);
  console.log(`extracting keywords for ${need.length} questions...`);
  const kwById = need.length ? await extractKeywords(need) : {};
  for (const q of questions) if (kwById[q.id]) q.keywords = kwById[q.id];
  writeJson(examPath, exam);
  console.log(`wrote keywords into exam-${EXAM_NUM}.json`);

  // 2. merge keywords.json
  const kwPath = path.join(Q_DIR, "keywords.json");
  const kwFile = readJson(kwPath);
  const map = kwFile.keywords;
  for (const q of questions) {
    for (const kw of q.keywords || []) {
      if (!map[kw]) map[kw] = [];
      if (!map[kw].includes(q.id)) map[kw].push(q.id);
    }
  }
  // re-sort by frequency desc (matches extract-keywords.ts output)
  const sorted = {};
  Object.entries(map).sort((a, b) => b[1].length - a[1].length).forEach(([k, v]) => (sorted[k] = v));
  kwFile.keywords = sorted;
  writeJson(kwPath, kwFile);
  console.log(`merged into keywords.json (${Object.keys(sorted).length} keywords)`);

  // 3. rebuild note relatedQuestionIds for this exam (note kw ∩ question kw)
  const index = readJson(path.join(NOTES_DIR, "index.json"));
  const lo = EXAM_NUM * 1000 + 1;
  const hi = EXAM_NUM * 1000 + questions.length;
  let touchedNotes = 0;
  const linkedQ = new Set();
  for (const meta of index) {
    const notePath = path.join(NOTES_DIR, `${meta.id}.json`);
    const note = readJson(notePath);
    const nk = new Set(note.relatedKeywords || []);
    // Recompute the FULL desired set for this exam range from scratch
    // (idempotent: re-runs converge instead of dropping prior links).
    const desired = questions
      .filter((q) => (q.keywords || []).some((k) => nk.has(k)))
      .map((q) => q.id);
    const outOfRange = (note.relatedQuestionIds || []).filter((id) => id < lo || id > hi);
    const next = [...outOfRange, ...desired];
    const prevCount = (note.relatedQuestionIds || []).length;
    if (next.length !== prevCount || desired.some((id) => !(note.relatedQuestionIds || []).includes(id))) {
      note.relatedQuestionIds = next;
      writeJson(notePath, note);
      meta.questionCount = next.length;
      touchedNotes++;
    }
    for (const id of desired) linkedQ.add(id);
  }
  writeJson(path.join(NOTES_DIR, "index.json"), index);
  console.log(`updated ${touchedNotes} notes; ${linkedQ.size}/${questions.length} questions now linked to >=1 note`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
