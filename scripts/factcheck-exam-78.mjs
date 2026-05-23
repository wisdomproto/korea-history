/**
 * 78회 AI 해설 사실검증 + 요약노트 커버리지 진단.
 *
 * 각 50문항에 대해:
 *   1. 요약노트(87편) 중 같은 era + 키워드 겹침 → top 3 매칭 (retrieval)
 *   2. Gemini 2.5 Pro에 (질문, 선지, 정답, AI해설, 매칭노트 본문)을 보내서:
 *      - 해설에 노트 근거가 약한 사실 주장이 있는지 (할루시네이션)
 *      - 노트 어느 부분과도 매칭이 안 되는 질문이라면 coverage gap
 *
 * 출력: scripts/output/exam-78-factcheck.md
 *
 * Usage: node scripts/factcheck-exam-78.mjs
 */
import fs from 'fs';
import path from 'path';

const PROJECT = 'C:/project/korea-history';
const EXAM_FILE = `${PROJECT}/data/questions/exam-78.json`;
const NOTES_DIR = `${PROJECT}/data/notes`;
const OUT_DIR = `${PROJECT}/scripts/output`;

// Gemini setup
const GEMINI_KEY = fs
  .readFileSync(`${PROJECT}/author-tool/.env`, 'utf-8')
  .split('\n')
  .find((l) => l.startsWith('GEMINI_API_KEY='))
  ?.split('=')[1]
  ?.trim();
if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY missing');

const MODEL = 'gemini-2.5-pro';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;

async function callGemini(prompt) {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  };
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status} ${await res.text()}`);
  const j = await res.json();
  const parts = j.candidates?.[0]?.content?.parts || [];
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].text) return parts[i].text;
  return '';
}

function parseJsonFromText(text) {
  text = text.trim();
  // strip markdown fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

// ── Load data ──────────────────────────────────────────────────────────
console.log('Loading exam-78 + 87 notes…');
const exam = JSON.parse(fs.readFileSync(EXAM_FILE, 'utf-8'));
const questions = exam.questions;

const noteFiles = fs
  .readdirSync(NOTES_DIR)
  .filter((f) => f.startsWith('s') && f.endsWith('.json'));
const notes = noteFiles.map((f) => {
  const n = JSON.parse(fs.readFileSync(path.join(NOTES_DIR, f), 'utf-8'));
  // Strip HTML tags from content for token efficiency
  const plain = (n.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    id: n.id,
    title: n.title,
    era: n.era,
    eraLabel: n.eraLabel,
    keywords: n.relatedKeywords || [],
    content: plain,
  };
});
console.log(`Loaded ${notes.length} notes, ${questions.length} questions`);

// ── Retrieval: era + keyword overlap ───────────────────────────────────
function retrieveNotesForQ(q) {
  const qText = `${q.content || ''} ${(q.choices || []).join(' ')} ${q.explanation || ''}`;

  const candidates = notes
    .filter((n) => {
      // era exact match (handle '선사·고조선' which may not match a note era exactly)
      if (n.era === q.era || n.eraLabel === q.era) return true;
      // Cross-era fallback: '선사·고조선' notes have era='선사·고조선' presumably
      return false;
    })
    .map((n) => {
      let score = 0;
      for (const kw of n.keywords) {
        if (kw && qText.includes(kw)) score += 2;
      }
      // also test title tokens
      const titleTokens = (n.title || '').split(/[\s,·]+/).filter((t) => t.length >= 2);
      for (const t of titleTokens) {
        if (qText.includes(t)) score += 1;
      }
      return { ...n, score };
    })
    .sort((a, b) => b.score - a.score);

  // If era didn't yield anything, fallback to any-era keyword search
  if (candidates.length === 0 || candidates[0].score === 0) {
    const fallback = notes
      .map((n) => {
        let score = 0;
        for (const kw of n.keywords) if (kw && qText.includes(kw)) score += 2;
        const titleTokens = (n.title || '').split(/[\s,·]+/).filter((t) => t.length >= 2);
        for (const t of titleTokens) if (qText.includes(t)) score += 1;
        return { ...n, score };
      })
      .filter((n) => n.score > 0)
      .sort((a, b) => b.score - a.score);
    if (fallback.length > 0) return fallback.slice(0, 3);
  }

  return candidates.slice(0, 3);
}

// ── Fact-check prompt ──────────────────────────────────────────────────
function buildFactCheckPrompt(q, matched) {
  const correctIdx = q.correctAnswer - 1;
  const correctChoice = q.choices[correctIdx] || '';
  const notesBlock = matched.length
    ? matched
        .map(
          (n, i) =>
            `[노트 ${i + 1}: ${n.id} — ${n.title} (${n.eraLabel})]\n${n.content.slice(0, 3500)}`,
        )
        .join('\n\n')
    : '(매칭된 요약노트 없음)';

  return `당신은 한국사능력검정시험 출제·검수 전문가입니다.
아래 문제에 대한 AI 해설이 같이 제공된 요약노트의 내용과 일치하는지 검증해주세요.

[문제 #${q.questionNumber} | 시대: ${q.era} | 분야: ${q.category}]
질문: ${q.content}
선지:
1) ${q.choices[0]}
2) ${q.choices[1]}
3) ${q.choices[2]}
4) ${q.choices[3]}
5) ${q.choices[4]}
공식 정답: ${q.correctAnswer}번 (${correctChoice})

[AI 해설]
${q.explanation || '(해설 없음)'}

[매칭된 요약노트]
${notesBlock}

[작업]
1. 매칭된 노트가 이 문제의 핵심 토픽을 다루는지 판단 (coverage)
2. AI 해설에 나오는 사실 주장 중 노트와 모순되거나, 노트에 전혀 없는 인물·연도·사건이 있다면 ⚠ 잠재적 할루시네이션으로 분류
3. 일반적인 한국사 상식 (예: 광개토대왕이 왕이었다)은 굳이 노트에 없어도 OK. 특정 연도, 특정 인물 행적, 특정 정책의 세부 내용처럼 검증이 필요한 사실에만 집중하세요.
4. 노트가 토픽을 잘 다루지 않으면 coverage="weak"로 보고

JSON으로만 답변 (다른 설명 없이):
{
  "coverage": "good" | "partial" | "weak" | "none",
  "coverage_notes": "어느 노트가 어느 정도로 토픽을 다루는지 한 줄 설명",
  "hallucination_risk": "none" | "low" | "medium" | "high",
  "flagged_claims": [
    { "claim": "해설에서 의심되는 주장 문장", "issue": "노트와 모순/노트에 없음/연도 불일치/etc", "severity": "low|medium|high" }
  ],
  "verdict": "정답·해설 모두 신뢰 가능 | 해설 일부 재확인 필요 | 해설 중대한 오류 의심"
}`;
}

// ── Main ───────────────────────────────────────────────────────────────
(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  const CONCURRENCY = 4;

  async function processQ(q) {
    if (!q.explanation || !q.explanation.trim()) {
      return {
        questionNumber: q.questionNumber,
        skipped: 'no_explanation',
      };
    }

    const matched = retrieveNotesForQ(q);
    const prompt = buildFactCheckPrompt(q, matched);

    try {
      const raw = await callGemini(prompt);
      const parsed = parseJsonFromText(raw);
      return {
        questionNumber: q.questionNumber,
        era: q.era,
        category: q.category,
        correctAnswer: q.correctAnswer,
        matched: matched.map((m) => ({ id: m.id, title: m.title, score: m.score })),
        ...parsed,
        rawResponse: parsed ? undefined : raw.slice(0, 500),
      };
    } catch (e) {
      return {
        questionNumber: q.questionNumber,
        error: String(e).slice(0, 200),
        matched: matched.map((m) => ({ id: m.id, title: m.title, score: m.score })),
      };
    }
  }

  // Process with concurrency
  console.log(`\nProcessing ${questions.length} questions with concurrency=${CONCURRENCY}…\n`);
  const queue = [...questions];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const q = queue.shift();
      const t0 = Date.now();
      const r = await processQ(q);
      const ms = Date.now() - t0;
      results.push(r);
      const status = r.skipped
        ? '⏭️'
        : r.error
        ? '❌'
        : r.hallucination_risk === 'none'
        ? '✅'
        : r.hallucination_risk === 'low'
        ? '🟢'
        : r.hallucination_risk === 'medium'
        ? '🟡'
        : r.hallucination_risk === 'high'
        ? '🔴'
        : '❓';
      console.log(
        `${status} Q${r.questionNumber.toString().padStart(2)} | cov=${r.coverage ?? '?'} | risk=${r.hallucination_risk ?? '?'} | ${ms}ms`,
      );
    }
  });
  await Promise.all(workers);

  results.sort((a, b) => a.questionNumber - b.questionNumber);

  // ── Write JSON ───────────────────────────────────────────────────────
  fs.writeFileSync(
    path.join(OUT_DIR, 'exam-78-factcheck.json'),
    JSON.stringify(results, null, 2),
  );

  // ── Write Markdown report ────────────────────────────────────────────
  const summary = {
    total: results.length,
    skipped: results.filter((r) => r.skipped).length,
    error: results.filter((r) => r.error).length,
    coverage: {},
    risk: {},
  };
  for (const r of results) {
    if (r.coverage) summary.coverage[r.coverage] = (summary.coverage[r.coverage] || 0) + 1;
    if (r.hallucination_risk)
      summary.risk[r.hallucination_risk] = (summary.risk[r.hallucination_risk] || 0) + 1;
  }

  const mdLines = [];
  mdLines.push(`# 78회 AI 해설 사실검증 + 요약노트 커버리지 리포트`);
  mdLines.push(``);
  mdLines.push(`생성일: ${new Date().toISOString().slice(0, 10)}  |  모델: ${MODEL}`);
  mdLines.push(``);
  mdLines.push(`## 요약`);
  mdLines.push(`- 처리: ${summary.total}/50 | skipped: ${summary.skipped} | error: ${summary.error}`);
  mdLines.push(`- 노트 커버리지: ${JSON.stringify(summary.coverage)}`);
  mdLines.push(`- 할루시네이션 risk: ${JSON.stringify(summary.risk)}`);
  mdLines.push(``);

  // List weak/none coverage questions
  const weak = results.filter((r) => ['weak', 'none'].includes(r.coverage));
  if (weak.length) {
    mdLines.push(`## ⚠ 요약노트 커버리지 부족 (${weak.length}문항)`);
    mdLines.push(``);
    for (const r of weak) {
      mdLines.push(
        `- **Q${r.questionNumber}** (${r.era}) — coverage=${r.coverage}, 매칭노트: ${r.matched
          ?.map((m) => `${m.id}(${m.score})`)
          .join(', ') || '없음'}`,
      );
      if (r.coverage_notes) mdLines.push(`  - ${r.coverage_notes}`);
    }
    mdLines.push(``);
  }

  // List medium+ risk questions
  const risky = results.filter((r) => ['medium', 'high'].includes(r.hallucination_risk));
  if (risky.length) {
    mdLines.push(`## ⚠ 해설 사실검증 필요 (${risky.length}문항)`);
    mdLines.push(``);
    for (const r of risky) {
      mdLines.push(`### Q${r.questionNumber} — risk=${r.hallucination_risk} | ${r.verdict || ''}`);
      if (r.flagged_claims?.length) {
        for (const c of r.flagged_claims) {
          mdLines.push(`- **[${c.severity}]** ${c.claim}`);
          mdLines.push(`  - 이슈: ${c.issue}`);
        }
      }
      mdLines.push(``);
    }
  }

  // All questions table
  mdLines.push(`## 전체 결과 표`);
  mdLines.push(``);
  mdLines.push(`| Q | 시대 | 분야 | 매칭노트 | cov | risk | verdict |`);
  mdLines.push(`|---|------|------|-----------|------|------|---------|`);
  for (const r of results) {
    const matched = r.matched?.map((m) => m.id).join(', ') || '-';
    mdLines.push(
      `| ${r.questionNumber} | ${r.era || '-'} | ${r.category || '-'} | ${matched} | ${r.coverage || '-'} | ${r.hallucination_risk || '-'} | ${(r.verdict || '').slice(0, 30)} |`,
    );
  }

  fs.writeFileSync(path.join(OUT_DIR, 'exam-78-factcheck.md'), mdLines.join('\n'));
  console.log(`\n✅ Report: ${path.join(OUT_DIR, 'exam-78-factcheck.md')}`);
  console.log(`✅ JSON: ${path.join(OUT_DIR, 'exam-78-factcheck.json')}`);
})().catch((e) => {
  console.error('FACT CHECK FAILED:', e);
  process.exit(1);
});
