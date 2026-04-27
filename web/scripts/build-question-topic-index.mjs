// 사전 매칭 인덱스: 5,290 9급 문제 × 169 단원 → top-3 매칭 단원 ID
// 출력: web/data/civil-notes/question-topic-map.json
//        web/data/civil-notes/topic-questions-map.json (역방향)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CBT_JSON_DIR = path.resolve(ROOT, 'cbt_data/json');
const CIVIL_NOTES_DIR = path.resolve(ROOT, 'web/data/civil-notes');

// 13 과목 — slug ↔ JSON 파일 stem
const SUBJECTS = [
  { slug: 'admin-law', stem: '9급_국가직_공무원_행정법총론.json' },
  { slug: 'admin-pa', stem: '9급_국가직_공무원_행정학개론.json' },
  { slug: 'criminal-law', stem: '9급_국가직_공무원_형법총론.json' },
  { slug: 'criminal-procedure', stem: '9급_국가직_공무원_형사소송법개론.json' },
  { slug: 'accounting', stem: '9급_국가직_공무원_회계학.json' },
  { slug: 'tax-law', stem: '9급_국가직_공무원_세법개론.json' },
  { slug: 'corrections', stem: '9급_국가직_공무원_교정학개론.json' },
  { slug: 'social-welfare', stem: '9급_국가직_공무원_사회복지학개론.json' },
  { slug: 'education', stem: '9급_국가직_공무원_교육학개론.json' },
  { slug: 'international-law', stem: '9급_국가직_공무원_국제법개론.json' },
  { slug: 'customs-law', stem: '9급_국가직_공무원_관세법개론.json' },
  { slug: 'korean', stem: '9급_국가직_공무원_국어.json' },
  { slug: 'english', stem: '9급_국가직_공무원_영어.json' },
];

// 매칭 결과
// questionTopicMap[noteSlug][examId][questionNumber] = [{ topicId, score, matched: [...] }, ...]
const questionTopicMap = {};
// 역방향: topicQuestionsMap[noteSlug][topicId] = [{ examId, examLabel, questionNumber, qText (preview), score }]
const topicQuestionsMap = {};

let totalQ = 0;
let totalMatched = 0;

const stats = []; // 과목별 통계

for (const subj of SUBJECTS) {
  const noteSlug = subj.slug;
  const cbtPath = path.join(CBT_JSON_DIR, subj.stem);
  if (!fs.existsSync(cbtPath)) {
    console.log(`✗ ${noteSlug}: CBT JSON not found`);
    continue;
  }

  const topicsIndexPath = path.join(CIVIL_NOTES_DIR, noteSlug, 'topics-index.json');
  if (!fs.existsSync(topicsIndexPath)) {
    console.log(`✗ ${noteSlug}: topics-index.json not found`);
    continue;
  }

  const cbtData = JSON.parse(fs.readFileSync(cbtPath, 'utf-8'));
  const topics = JSON.parse(fs.readFileSync(topicsIndexPath, 'utf-8'));

  questionTopicMap[noteSlug] = {};
  topicQuestionsMap[noteSlug] = {};
  for (const t of topics) topicQuestionsMap[noteSlug][t.topicId] = [];

  let subjQ = 0;
  let subjMatched = 0;
  let subjFallback = 0;

  for (const exam of cbtData.exams || []) {
    const examId = exam.exam_id;
    const examLabel = exam.label;
    questionTopicMap[noteSlug][examId] = {};

    for (const q of exam.questions || []) {
      const qNum = q.number;
      const qText = q.text || '';
      const choicesText = (q.choices || [])
        .map((c) => c.text || '')
        .join(' ');
      const haystack = `${qText} ${choicesText}`;

      // 단원별 매칭 점수
      const scored = topics
        .map((t) => {
          const matched = (t.keywords || []).filter((k) => haystack.includes(k));
          return { topicId: t.topicId, score: matched.length, matched };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

      let top3;
      if (scored.length === 0) {
        // fallback: 가장 빈출 단원 1개
        const fallback = [...topics].sort((a, b) => (b.freq || 0) - (a.freq || 0))[0];
        if (fallback) {
          top3 = [{ topicId: fallback.topicId, score: 0, matched: [], isFallback: true }];
          subjFallback += 1;
        } else {
          top3 = [];
        }
      } else {
        top3 = scored.slice(0, 3);
        subjMatched += 1;
      }

      questionTopicMap[noteSlug][examId][qNum] = top3;

      // 역방향
      for (const t of top3) {
        topicQuestionsMap[noteSlug][t.topicId].push({
          examId,
          examLabel,
          questionNumber: qNum,
          qPreview: qText.slice(0, 100),
          score: t.score,
        });
      }
      subjQ += 1;
    }
  }

  // 단원별 역방향 정렬: score 높은 순, 같으면 최신 회차 우선
  for (const tid in topicQuestionsMap[noteSlug]) {
    topicQuestionsMap[noteSlug][tid].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.examId.localeCompare(a.examId);
    });
  }

  totalQ += subjQ;
  totalMatched += subjMatched;
  stats.push({
    noteSlug,
    totalQ: subjQ,
    matched: subjMatched,
    fallback: subjFallback,
    matchedPct: ((subjMatched / Math.max(1, subjQ)) * 100).toFixed(1),
  });
  console.log(
    `✓ ${noteSlug}: ${subjQ} Q · 매칭 ${subjMatched} (${((subjMatched / Math.max(1, subjQ)) * 100).toFixed(1)}%) · fallback ${subjFallback}`,
  );
}

// 저장
fs.writeFileSync(
  path.join(CIVIL_NOTES_DIR, 'question-topic-map.json'),
  JSON.stringify(questionTopicMap),
);
fs.writeFileSync(
  path.join(CIVIL_NOTES_DIR, 'topic-questions-map.json'),
  JSON.stringify(topicQuestionsMap),
);
fs.writeFileSync(
  path.join(CIVIL_NOTES_DIR, 'matching-stats.json'),
  JSON.stringify(stats, null, 2),
);

console.log(
  `\n→ 총 ${totalQ}문제 매칭 (${totalMatched} 직접 매칭 = ${((totalMatched / Math.max(1, totalQ)) * 100).toFixed(1)}%)`,
);
console.log(`→ 출력: ${CIVIL_NOTES_DIR}/question-topic-map.json`);
console.log(`→ 출력: ${CIVIL_NOTES_DIR}/topic-questions-map.json`);
