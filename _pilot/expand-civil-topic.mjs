/**
 * 행정법 t1 단원을 한능검 노트 수준으로 Gemini 2.5 Flash 확장 — 시범 1회용.
 *
 * 입력: web/data/civil-notes/admin-law/topics/t1.json (seed)
 * 참조: data/notes/s5-04.json (한능검 노트 구조 레퍼런스)
 * 출력: _pilot/output/admin-law-t1-gemini-flash.html (본문 HTML)
 *       _pilot/output/admin-law-t1-meta.json (분량·구조 통계)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = "C:\\project\\korea-history\\author-tool\\.env";

// .env에서 GEMINI_API_KEY 추출
function loadApiKey() {
  const envText = fs.readFileSync(ENV_PATH, "utf-8");
  const match = envText.match(/^GEMINI_API_KEY=(.+)$/m);
  if (!match) throw new Error("GEMINI_API_KEY not found in " + ENV_PATH);
  return match[1].trim();
}

function loadSeed() {
  const seedPath = path.join(ROOT, "web/data/civil-notes/admin-law/topics/t1.json");
  return JSON.parse(fs.readFileSync(seedPath, "utf-8"));
}

function loadHaneungReference() {
  // 한능검 s5-04 노트 (대한제국과 국권 피탈) — 구조 패턴만 참조용
  const refPath = path.join(ROOT, "data/notes/s5-04.json");
  const note = JSON.parse(fs.readFileSync(refPath, "utf-8"));
  // 본문 너무 길면 중간 컷 — 구조 보여주는 첫 ~6000자
  const sample = note.content.substring(0, 6000);
  return sample;
}

function buildPrompt(seed, reference) {
  return `당신은 9급 공무원 시험 준비생을 위한 한국 최고의 행정법 단권화 노트 작성자입니다.

# 작업
주어진 [SEED 단원]을 [REFERENCE 한능검 노트 구조]를 따라 약 18,000~22,000자 분량의 풍부한 단권화 노트로 확장하세요.

# 출력 형식 — HTML 본문만
- 출력은 \`<details>...</details>\` 들의 연속으로 시작하는 순수 HTML 문자열. 전체를 \`\`\`html ... \`\`\` 펜스로 감싸지 말고 raw HTML만.
- 최상위 5~7개 \`<details><summary><strong>아이콘 + 큰 섹션명</strong></summary><div class="content">...</div></details>\`
- 각 최상위 details 안에 2~5개 \`<details class="sub-details"><summary>세부 주제</summary><div class="content">...</div></details>\` 중첩
- 핵심 용어는 \`<span class="keyword">용어명</span>\` 으로 감싸기 (시각적 강조 + 검색)
- 결정적 사실은 \`<span class="highlight">사실</span>\` 으로 감싸기 (노란 배경 처리됨)
- 비교·구분이 필요한 곳은 \`<table>\` (\`<thead><tr><th>\` 헤더 + \`<tbody><tr><td>\` 행) 사용
- 절차/순서는 \`<ol>\` 또는 \`<table>\` 시기 컬럼으로 표현
- \`<h4>\` 는 sub-details 내부에서만 사용 (계층 혼란 방지)
- \`<ul>\` 은 짧은 리스트, 표가 더 적절하면 표로

# 콘텐츠 깊이
- 단순 정의 나열 X. 핵심 개념 → 분류 → 효력 → 판례 요지 → 빈출 함정 → 비교표 흐름.
- 9급 시험 빈출 포인트 강조 (수험서/공직 합격노트 수준).
- 판례는 핵심 판시사항만 1~2줄로 요약 (사건번호 X, 판시 요지 ○).
- 시험에 자주 나오는 함정/지문/오답유형도 별도 details로 정리.

# SEED (현재 보유 본문 — 부족함, 이걸 골격으로 8~10배 확장)
TITLE: ${seed.title}
KEYWORDS: ${seed.keywords.join(", ")}
HTML:
${seed.html}

# REFERENCE — 한능검 노트 구조 (s5-04 대한제국 노트 일부, 풍부한 details/table/keyword/highlight 사용 패턴)
${reference}

# 시작 — 반드시 raw HTML만 출력 (마크다운 펜스 금지, 설명 금지)
`;
}

async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 32768,
      topK: 40,
      topP: 0.95,
    },
  };
  console.log("[Gemini] 호출 중... (예상 30~60초)");
  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini API ${res.status}: ${t.substring(0, 500)}`);
  }
  const data = await res.json();
  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  const usage = data.usageMetadata ?? {};
  console.log(`[Gemini] 완료 ${dur}s · prompt ${usage.promptTokenCount} / output ${usage.candidatesTokenCount} 토큰`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("[ERR] No text in response:", JSON.stringify(data, null, 2).substring(0, 1000));
    throw new Error("No text in Gemini response");
  }
  return { text, usage, durationSec: parseFloat(dur) };
}

function stripMarkdownFence(text) {
  return text
    .replace(/^```(?:html)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
}

function analyze(html) {
  const detailsTop = (html.match(/<details(?![^>]*sub-details)/g) || []).length;
  const detailsSub = (html.match(/<details[^>]*sub-details/g) || []).length;
  const tables = (html.match(/<table/g) || []).length;
  const keywords = (html.match(/<span class="keyword">/g) || []).length;
  const highlights = (html.match(/<span class="highlight">/g) || []).length;
  const h4s = (html.match(/<h4>/g) || []).length;
  return { chars: html.length, detailsTop, detailsSub, tables, keywords, highlights, h4s };
}

async function main() {
  const apiKey = loadApiKey();
  const seed = loadSeed();
  const reference = loadHaneungReference();
  const prompt = buildPrompt(seed, reference);
  fs.mkdirSync(path.join(ROOT, "_pilot/output"), { recursive: true });

  // Save prompt for inspection
  fs.writeFileSync(path.join(ROOT, "_pilot/output/prompt.txt"), prompt);
  console.log(`[seed] ${seed.title} (${seed.chars}자)`);
  console.log(`[prompt] ${prompt.length}자`);

  const { text, usage, durationSec } = await callGemini(apiKey, prompt);
  const html = stripMarkdownFence(text);
  const stats = analyze(html);

  const outHtml = path.join(ROOT, "_pilot/output/admin-law-t1-gemini-flash.html");
  const outMeta = path.join(ROOT, "_pilot/output/admin-law-t1-meta.json");
  fs.writeFileSync(outHtml, html);
  fs.writeFileSync(
    outMeta,
    JSON.stringify(
      {
        seed: { chars: seed.chars, title: seed.title },
        output: stats,
        gemini: { model: "gemini-2.5-flash", durationSec, ...usage },
        ratio: { sizeMultiple: (stats.chars / seed.chars).toFixed(1) + "x" },
      },
      null,
      2,
    ),
  );

  console.log("\n=== 결과 ===");
  console.log(`출력: ${outHtml}`);
  console.log(`분량: ${stats.chars.toLocaleString()}자 (seed의 ${(stats.chars / seed.chars).toFixed(1)}배)`);
  console.log(`구조: details(top) ${stats.detailsTop} / sub ${stats.detailsSub} / 표 ${stats.tables} / keyword ${stats.keywords} / highlight ${stats.highlights} / h4 ${stats.h4s}`);
  console.log(`소요: ${durationSec}s`);
}

main().catch((e) => {
  console.error("[FATAL]", e.message);
  process.exit(1);
});
