/**
 * Compare all question explanations against summary-notes.html
 * Find meaningful historical topics missing from notes.
 * Strategy: extract named entities (people, places, events, terms) rather than all words.
 */
const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
const NOTES_PATH = path.join(__dirname, '..', 'public', 'summary-notes.html');

const notesHtml = fs.readFileSync(NOTES_PATH, 'utf-8');
const notesText = notesHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const examFiles = fs.readdirSync(QUESTIONS_DIR)
  .filter(f => f.match(/^exam-\d+\.json$/))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

// Historical term patterns - extract specific named entities
// These patterns match common Korean history exam term formats
const TERM_PATTERNS = [
  // People names (2-3 char Korean names)
  /([가-힣]{1,2}[왕후제](?:\s|$))/g,
  // Specific historical terms we want to check
];

// Instead of extracting all words, let's extract phrases that look like
// historical proper nouns / events / terms
function extractHistoricalTerms(text) {
  if (!text) return [];
  const terms = new Set();

  // Pattern 1: X의 난, X의 변, X 전투 etc
  const eventPatterns = [
    /([가-힣]{2,6})의\s*난/g,
    /([가-힣]{2,6})의\s*변/g,
    /([가-힣]{2,6})\s*전투/g,
    /([가-힣]{2,6})\s*전쟁/g,
    /([가-힣]{2,6})\s*조약/g,
    /([가-힣]{2,6})\s*협약/g,
    /([가-힣]{2,8})\s*사건/g,
  ];
  for (const pat of eventPatterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      terms.add(m[0].trim());
    }
  }

  // Pattern 2: Quoted terms 「X」 or 『X』
  const quoted = text.match(/[「『][^」』]+[」』]/g) || [];
  for (const q of quoted) terms.add(q);

  // Pattern 3: Terms with parentheses indicating explanation
  const paren = text.match(/([가-힣]{2,8})\s*\([^)]+\)/g) || [];
  for (const p of paren) {
    const mainTerm = p.match(/^([가-힣]{2,8})/);
    if (mainTerm) terms.add(mainTerm[1]);
  }

  // Pattern 4: Specific multi-char historical terms (3+ chars, likely proper nouns)
  // Extract all 3+ character Korean word sequences
  const words = text.match(/[가-힣]{3,}/g) || [];
  for (const w of words) {
    if (w.length >= 3 && !isCommonWord(w)) {
      terms.add(w);
    }
  }

  return [...terms];
}

// Filter out common Korean grammar/function words
function isCommonWord(w) {
  const commonSuffixes = [
    '입니다', '습니다', '했습니', '됩니다', '있습니', '었습니',
    '하였다', '되었다', '하였고', '되었고', '하였으', '되었으',
    '하는것', '되는것', '한것은', '된것은',
    '에서는', '으로는', '에게는', '까지는', '부터는',
    '이라고', '라고도', '이라는', '라는것',
    '옳은것', '설명으', '것으로', '사실로', '내용으',
    '활동으', '모습으', '시기의', '시기를', '시기에',
    '인물에', '인물은', '인물이', '인물의',
    '문제는', '문제의', '문제에', '정답은', '정답이',
    '키워드', '선지의', '해설을', '보기의',
  ];
  const commonWords = [
    '옳은', '밑줄', '그은', '들어갈', '나타난', '일어난', '옳게', '고른',
    '따라서', '이후에', '당시의', '이전에', '관련된', '해당하',
    '대하여', '그러나', '그리고', '하지만', '때문에', '그래서',
    '이러한', '그러한', '저러한', '어떤것', '이것은', '그것은',
    '않았다', '않는다', '없었다', '있었다', '있었던', '하였던',
    '기출문', '시험에', '출제된', '자주출',
  ];
  if (commonWords.includes(w)) return true;
  for (const s of commonSuffixes) {
    if (w.includes(s)) return true;
  }
  // Pure verb/adjective endings
  if (w.endsWith('하다') || w.endsWith('되다') || w.endsWith('있다') || w.endsWith('없다')) return true;
  if (w.endsWith('한다') || w.endsWith('된다') || w.endsWith('있는') || w.endsWith('없는')) return true;
  if (w.endsWith('하여') || w.endsWith('되어') || w.endsWith('하며') || w.endsWith('되며')) return true;
  if (w.endsWith('하고') || w.endsWith('되고') || w.endsWith('에서') || w.endsWith('으로')) return true;
  if (w.endsWith('이며') || w.endsWith('에는') || w.endsWith('했다') || w.endsWith('했던')) return true;
  if (w.endsWith('했고') || w.endsWith('했으') || w.endsWith('였다') || w.endsWith('였고')) return true;
  if (w.endsWith('겠다') || w.endsWith('라는') || w.endsWith('라고') || w.endsWith('이다')) return true;
  if (w.endsWith('인데') || w.endsWith('지만') || w.endsWith('므로') || w.endsWith('이나')) return true;
  if (w.endsWith('에게') || w.endsWith('까지') || w.endsWith('부터') || w.endsWith('대한')) return true;
  return false;
}

// Collect all questions
const allQuestions = [];
for (const file of examFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf-8'));
  const examNum = data.exam?.examNumber || parseInt(file.match(/\d+/)[0]);
  for (const q of data.questions) {
    if (q.explanation) {
      allQuestions.push({ ...q, examNumber: examNum });
    }
  }
}
console.log(`Total questions with explanations: ${allQuestions.length}\n`);

// Extract terms from all questions
const termInfo = {}; // term -> { count, eras, examples }

for (const q of allQuestions) {
  const terms = extractHistoricalTerms(q.explanation + ' ' + (q.content || ''));
  const seen = new Set();
  for (const t of terms) {
    if (seen.has(t)) continue;
    seen.add(t);
    if (!termInfo[t]) termInfo[t] = { count: 0, eras: new Set(), examples: [] };
    termInfo[t].count++;
    termInfo[t].eras.add(q.era);
    if (termInfo[t].examples.length < 2) {
      termInfo[t].examples.push(`${q.examNumber}회${q.questionNumber}번`);
    }
  }
}

// Find terms missing from notes, frequency >= 3
const missing = [];
for (const [term, info] of Object.entries(termInfo)) {
  if (info.count < 3) continue;
  if (term.length < 3) continue; // too short to be meaningful
  if (!notesText.includes(term)) {
    missing.push({ term, count: info.count, eras: [...info.eras], examples: info.examples });
  }
}
missing.sort((a, b) => b.count - a.count);

// Filter: only show terms that are likely actual historical terms
// (not grammar fragments)
const meaningful = missing.filter(t => {
  const w = t.term;
  // Skip if it's a pure grammar fragment
  if (w.length <= 2) return false;
  if (/^[가-힣]{2}(은|는|이|가|을|를|의|에|와|과|도|만|로|서|든)$/.test(w)) return false;
  return true;
});

console.log('=== MISSING HISTORICAL TERMS (freq >= 3, sorted by frequency) ===\n');

// Top 100
for (const t of meaningful.slice(0, 150)) {
  console.log(`${t.term} (${t.count}회) | ${t.eras.join(', ')} | ${t.examples.join(', ')}`);
}
console.log(`\n... total: ${meaningful.length} missing terms (showing top 150)`);

// Phase 2: Question-level gap analysis
// For each question, check what % of its key terms are in notes
console.log('\n\n=== QUESTIONS WITH MOST GAPS ===');
console.log('(Questions where many key terms are missing from notes)\n');

const questionGaps = [];
for (const q of allQuestions) {
  const terms = extractHistoricalTerms(q.explanation + ' ' + (q.content || ''));
  const uniqueTerms = [...new Set(terms)].filter(t => t.length >= 3);
  if (uniqueTerms.length === 0) continue;

  const missingTerms = uniqueTerms.filter(t => !notesText.includes(t) && !isCommonWord(t));
  const ratio = missingTerms.length / uniqueTerms.length;

  if (missingTerms.length >= 3 && ratio >= 0.3) {
    questionGaps.push({
      exam: q.examNumber,
      num: q.questionNumber,
      era: q.era,
      category: q.category,
      content: q.content?.substring(0, 80),
      missingTerms: missingTerms.slice(0, 8),
      ratio: ratio,
      totalTerms: uniqueTerms.length,
    });
  }
}

questionGaps.sort((a, b) => b.missingTerms.length - a.missingTerms.length);

for (const g of questionGaps.slice(0, 60)) {
  console.log(`[${g.exam}회 ${g.num}번] ${g.era}/${g.category} (${g.missingTerms.length}/${g.totalTerms} missing)`);
  console.log(`  ${g.content}`);
  console.log(`  누락: ${g.missingTerms.join(', ')}`);
  console.log('');
}
console.log(`Total questions with significant gaps: ${questionGaps.length}`);
