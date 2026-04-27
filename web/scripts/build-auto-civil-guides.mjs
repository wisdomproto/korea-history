// Phase A: 730 stem 자동 단권화 인프라
// 각 stem에서:
//   1. 문제 첫 주제어 빈도 클러스터링 → 자동 토픽 (단원) N개
//   2. 토픽별 키워드 추출
//   3. 토픽별 매칭 기출문제 (사전 인덱스)
//
// 출력: web/data/civil-notes-auto/{stemSlug}/{topic-index.json, topics/{tid}.json, q-map.json}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CBT_JSON_DIR = path.resolve(ROOT, 'cbt_data/json');
const OUT_DIR = path.resolve(ROOT, 'web/data/civil-notes-auto');
const CATEGORIES_PATH = path.resolve(ROOT, 'cbt_data/_r2_categories.json');

// 스킵 — 이미 수동 작성한 9급 13개 과목
const SKIP_STEMS = new Set([
  '9급_국가직_공무원_행정법총론',
  '9급_국가직_공무원_행정학개론',
  '9급_국가직_공무원_형법총론',
  '9급_국가직_공무원_형사소송법개론',
  '9급_국가직_공무원_회계학',
  '9급_국가직_공무원_세법개론',
  '9급_국가직_공무원_교정학개론',
  '9급_국가직_공무원_사회복지학개론',
  '9급_국가직_공무원_교육학개론',
  '9급_국가직_공무원_국제법개론',
  '9급_국가직_공무원_관세법개론',
  '9급_국가직_공무원_국어',
  '9급_국가직_공무원_영어',
]);

// 무의미 stopwords
const STOPWORDS = new Set([
  '다음', '아래', '위', '대한', '관한', '관해', '대해', '해당', '내용',
  '설명', '경우', '사례', '예시', '있는', '없는', '옳은', '옳지',
  '아닌', '맞는', '틀린', '하는', '되는', '되어', '있다', '없다',
  '이다', '이를', '이런', '그런', '저런', '어떤', '어느', '어떻게',
  '모두', '모든', '각각', '각자', '함께', '같이', '동시', '먼저',
  '주어진', '제시문', '자료', '이용', '토대', '의하여', '바탕', '근거',
  '문장', '단어', '밑줄', '글의', '글에', '글을', '글이', '문제',
]);

function isStopword(w) {
  return STOPWORDS.has(w) || w.length < 2;
}

// 문제 text에서 주제어(단원 후보) 추출
function extractTopicPhrase(text) {
  if (!text) return null;
  // 패턴 1: "X에 (대한|관한) 설명으로"
  let m = text.match(/^[\d\.\s]*([^.?!\n]{3,40}?)에\s*(대한|관한|관)\s/);
  if (m) {
    let phrase = m[1].trim()
      .replace(/[「『｢」』｣()<>《》【】]/g, '')
      .replace(/^[\d\.\s]+/, '')
      .replace(/^\s*다음/, '')
      .trim();
    if (phrase.length >= 3 && phrase.length <= 30 && !isStopword(phrase)) return phrase;
  }
  // 패턴 2: "X상의" or "X상" + 다음 어절
  m = text.match(/^[\d\.\s]*([^.?!\n]{3,30}?)(?:상의|상)\s/);
  if (m) {
    let phrase = m[1].trim().replace(/[「『｢」』｣()<>]/g, '').trim();
    if (phrase.length >= 3 && phrase.length <= 25 && !isStopword(phrase)) return phrase;
  }
  // 패턴 3: 첫 명사구 (한자어 4~12자)
  m = text.match(/^[\d\.\s]*([가-힣]{4,12})/);
  if (m && !isStopword(m[1])) return m[1];
  return null;
}

// 단원 키워드 추출 — 문제 + 정답 선지에서 빈출 명사 (4~12자)
function extractKeywords(questions) {
  const counts = {};
  for (const q of questions) {
    const haystack = (q.text || '') + ' ' + (q.choices || []).map(c => c.text || '').join(' ');
    const matches = haystack.match(/[가-힣]{3,15}/g) || [];
    for (const w of matches) {
      if (isStopword(w)) continue;
      counts[w] = (counts[w] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .filter(([k, v]) => v >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([k]) => k);
}

// 비슷한 주제어 클러스터링 (한자어 prefix or 부분문자열 매칭)
function normalizeTopic(t) {
  // 끝 조사 제거
  return t.replace(/(?:법|의|에|와|과|을|를|이|가|은|는|에서)$/, '').trim();
}

function clusterTopics(rawTopics) {
  // rawTopics = [{ phrase, count, questions }, ...]
  // 비슷한 phrase 합치기 (정규화 후 동일하면 같은 토픽)
  const clusters = new Map();
  for (const r of rawTopics) {
    const key = normalizeTopic(r.phrase);
    if (clusters.has(key)) {
      const c = clusters.get(key);
      c.count += r.count;
      c.questions.push(...r.questions);
      // 더 긴 phrase로 업데이트
      if (r.phrase.length > c.label.length) c.label = r.phrase;
    } else {
      clusters.set(key, {
        key,
        label: r.phrase,
        count: r.count,
        questions: [...r.questions],
      });
    }
  }
  return [...clusters.values()].sort((a, b) => b.count - a.count);
}

// stem 처리
function processStem(stem) {
  const stemSlug = stem.replace(/^9급|7급|5급/, '').trim();
  const fullStem = stem.replace(/\s+/g, '_');
  const jsonPath = path.join(CBT_JSON_DIR, `${fullStem}.json`);

  if (!fs.existsSync(jsonPath)) return { stem, error: 'JSON not found' };
  if (SKIP_STEMS.has(fullStem)) return { stem, skipped: 'manual note exists' };

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const allQ = (data.exams || []).flatMap(e =>
    (e.questions || []).map(q => ({ ...q, examId: e.exam_id, examLabel: e.label })),
  );
  if (allQ.length < 20) return { stem, skipped: 'too few questions' };

  // 1. 주제어 추출
  const phraseMap = {};
  for (const q of allQ) {
    const phrase = extractTopicPhrase(q.text);
    if (!phrase) continue;
    if (!phraseMap[phrase]) phraseMap[phrase] = { phrase, count: 0, questions: [] };
    phraseMap[phrase].count += 1;
    phraseMap[phrase].questions.push(q);
  }

  // 2. 빈도 ≥ 3 만 단원 후보
  const candidates = Object.values(phraseMap).filter(p => p.count >= 3);
  if (candidates.length === 0) return { stem, skipped: 'no topics' };

  // 3. 클러스터링
  let clusters = clusterTopics(candidates);
  // 상위 18개만
  clusters = clusters.slice(0, 18);

  // 4. 단원별 키워드 추출
  const topics = clusters.map((c, idx) => {
    const keywords = extractKeywords(c.questions);
    return {
      topicId: `t${idx + 1}`,
      ord: idx + 1,
      title: c.label,
      freq: c.count,
      keywords: keywords.slice(0, 20),
      questionCount: c.questions.length,
    };
  });

  // 5. 매칭 인덱스 (모든 문제 → top-3 단원)
  const qMap = {};
  let matched = 0;
  let fallback = 0;
  for (const exam of data.exams || []) {
    qMap[exam.exam_id] = {};
    for (const q of exam.questions || []) {
      const haystack = (q.text || '') + ' ' + (q.choices || []).map(c => c.text || '').join(' ');
      const scored = topics
        .map(t => {
          const m = (t.keywords || []).filter(k => haystack.includes(k));
          return { topicId: t.topicId, score: m.length };
        })
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

      let top;
      if (scored.length === 0) {
        const fb = topics[0];
        top = fb ? [{ topicId: fb.topicId, score: 0, isFallback: true }] : [];
        if (fb) fallback += 1;
      } else {
        top = scored.slice(0, 3);
        matched += 1;
      }
      qMap[exam.exam_id][q.number] = top;
    }
  }

  // 6. 역방향 인덱스
  const tqMap = {};
  for (const t of topics) tqMap[t.topicId] = [];
  for (const examId in qMap) {
    const examLabel = data.exams.find(e => e.exam_id === examId)?.label || examId;
    for (const qn in qMap[examId]) {
      const top = qMap[examId][qn];
      const q = data.exams.find(e => e.exam_id === examId)?.questions.find(qq => String(qq.number) === qn);
      for (const t of top) {
        if (t.isFallback) continue;
        tqMap[t.topicId].push({
          examId, examLabel, questionNumber: parseInt(qn, 10),
          qPreview: (q?.text || '').slice(0, 100),
          score: t.score,
        });
      }
    }
  }
  // 역방향 정렬
  for (const tid in tqMap) {
    tqMap[tid].sort((a, b) => b.score - a.score || b.examId.localeCompare(a.examId));
  }

  // 저장
  const outDir = path.join(OUT_DIR, fullStem);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'topics-index.json'), JSON.stringify(topics, null, 2));
  fs.writeFileSync(path.join(outDir, 'q-map.json'), JSON.stringify(qMap));
  fs.writeFileSync(path.join(outDir, 'tq-map.json'), JSON.stringify(tqMap));
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({
    stem: fullStem,
    totalQ: allQ.length,
    totalExams: (data.exams || []).length,
    topics: topics.length,
    matched,
    fallback,
    matchedPct: ((matched / allQ.length) * 100).toFixed(1),
    updated: new Date().toISOString(),
  }, null, 2));

  return { stem, topics: topics.length, totalQ: allQ.length, matched };
}

// === 실행 ===
fs.mkdirSync(OUT_DIR, { recursive: true });

const cats = JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf-8'));
const stems = cats.map(c => c.name);

console.log(`총 ${stems.length} stem 처리 시작\n`);

const results = [];
let processed = 0;
let skipped = 0;
let errored = 0;

for (const stem of stems) {
  try {
    const r = processStem(stem);
    if (r.skipped) {
      skipped += 1;
    } else if (r.error) {
      errored += 1;
      console.log(`✗ ${stem}: ${r.error}`);
    } else {
      processed += 1;
      results.push(r);
      // 50개마다 상태 출력
      if (processed % 50 === 0) {
        console.log(`  [${processed}/${stems.length}] ${stem} — ${r.topics}토픽, ${r.totalQ}문제`);
      }
    }
  } catch (e) {
    errored += 1;
    console.log(`✗ ${stem}: ${e.message}`);
  }
}

// 전역 인덱스 저장
fs.writeFileSync(
  path.join(OUT_DIR, '_index.json'),
  JSON.stringify(results.map(r => ({
    stem: r.stem,
    topics: r.topics,
    totalQ: r.totalQ,
  })), null, 2),
);

console.log(`\n=== 완료 ===`);
console.log(`처리: ${processed}, 스킵: ${skipped}, 에러: ${errored}`);
console.log(`총 토픽: ${results.reduce((a, r) => a + r.topics, 0)}`);
console.log(`총 문제: ${results.reduce((a, r) => a + r.totalQ, 0)}`);
console.log(`출력: ${OUT_DIR}/`);
