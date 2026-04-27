// Step A: 단원 단위 분해
// docs/{slug}-summary-note.html → web/data/civil-notes/{slug}/topics/{topicId}.json
// Each topic = <section id="X">...</section> 또는 <h2 id="X">...다음 <h2> 직전까지</h2>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../../docs');
const OUT_DIR = path.resolve(__dirname, '../data/civil-notes');

const NOTES = [
  { slug: 'admin-law', file: 'admin-law-summary-note.html', subject: '행정법총론' },
  { slug: 'admin-pa', file: 'admin-pa-summary-note.html', subject: '행정학개론' },
  { slug: 'criminal-law', file: 'criminal-law-summary-note.html', subject: '형법총론' },
  { slug: 'criminal-procedure', file: 'criminal-procedure-summary-note.html', subject: '형사소송법개론' },
  { slug: 'accounting', file: 'accounting-summary-note.html', subject: '회계학' },
  { slug: 'tax-law', file: 'tax-law-summary-note.html', subject: '세법개론' },
  { slug: 'corrections', file: 'corrections-summary-note.html', subject: '교정학개론' },
  { slug: 'social-welfare', file: 'social-welfare-summary-note.html', subject: '사회복지학개론' },
  { slug: 'education', file: 'education-summary-note.html', subject: '교육학개론' },
  { slug: 'international-law', file: 'international-law-summary-note.html', subject: '국제법개론' },
  { slug: 'customs-law', file: 'customs-law-summary-note.html', subject: '관세법개론' },
  { slug: 'korean', file: 'korean-summary-note.html', subject: '국어' },
  { slug: 'english', file: 'english-summary-note.html', subject: '영어' },
  { slug: 'constitution', file: 'constitution-summary-note.html', subject: '헌법' },
  { slug: 'engineer-info-processing', file: 'engineer-info-processing-summary-note.html', subject: '정보처리기사' },
  { slug: 'industrial-safety-engineer', file: 'industrial-safety-engineer-summary-note.html', subject: '산업안전기사' },
  { slug: 'realtor-1', file: 'realtor-1-summary-note.html', subject: '공인중개사 1차' },
  { slug: 'realtor-2', file: 'realtor-2-summary-note.html', subject: '공인중개사 2차' },
  { slug: 'computer-skills-1', file: 'computer-skills-1-summary-note.html', subject: '컴퓨터활용능력 1급' },
  { slug: 'accounting-cert-1', file: 'accounting-cert-1-summary-note.html', subject: '전산회계 1급' },
  { slug: 'electrical-engineer', file: 'electrical-engineer-summary-note.html', subject: '전기기사' },
  { slug: 'social-research-2', file: 'social-research-2-summary-note.html', subject: '사회조사분석사 2급' },
  { slug: 'career-counselor-2', file: 'career-counselor-2-summary-note.html', subject: '직업상담사 2급' },
];

function extractTitle(html) {
  // 단원 첫 h2 또는 .topic-name 텍스트
  const m1 = html.match(/<h2[^>]*class="topic-name"[^>]*>([\s\S]*?)<\/h2>/i);
  if (m1) return cleanText(m1[1]);
  const m2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  if (m2) return cleanText(m2[1]);
  const m3 = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  if (m3) return cleanText(m3[1]);
  return '단원';
}

function cleanText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractKeywords(html) {
  const set = new Set();
  const re = /<strong[^>]*>([^<]{2,40})<\/strong>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const t = m[1].replace(/[「『｢」』｣().,:;]/g, '').trim();
    if (t.length >= 3 && t.length <= 18 && /[가-힣A-Za-z]/.test(t) && !/^\d/.test(t)) {
      set.add(t);
    }
  }
  return [...set].slice(0, 30);
}

function extractFreq(html) {
  // "출제 6회" 또는 "출제 12회" 패턴
  const m = html.match(/출제\s*(\d+)\s*회/);
  return m ? parseInt(m[1], 10) : 0;
}

function splitByTag(bodyHtml, tag) {
  // 같은 tag 내 id 매칭으로 단원 분해. open=`<TAG ... id="X">`, close=`</TAG>` (single-level only).
  // section 분해용: nesting 없음.
  const topics = [];
  const openRe = new RegExp(`<${tag}([^>]*?)id="([^"]+)"([^>]*)>`, 'gi');
  let m;
  const opens = [];
  while ((m = openRe.exec(bodyHtml)) !== null) {
    opens.push({ id: m[2], start: m.index, openEnd: m.index + m[0].length });
  }
  const closeTag = `</${tag}>`;
  for (let i = 0; i < opens.length; i++) {
    const o = opens[i];
    const next = opens[i + 1];
    let end;
    if (next) {
      end = next.start;
      // 마지막 </TAG>를 찾아 잘라냄
      const closeIdx = bodyHtml.lastIndexOf(closeTag, end);
      if (closeIdx > o.openEnd) end = closeIdx;
    } else {
      // 마지막 단원: 끝까지
      const closeIdx = bodyHtml.lastIndexOf(closeTag);
      end = closeIdx > o.openEnd ? closeIdx : bodyHtml.length;
    }
    const inner = bodyHtml.slice(o.openEnd, end);
    topics.push({ id: o.id, html: inner });
  }
  return topics;
}

function splitByH2WithId(bodyHtml) {
  // <h2 id="X">까지 다음 <h2 id=... 또는 <footer> 직전까지
  const topics = [];
  const openRe = /<h2([^>]*?)id="([^"]+)"([^>]*)>([\s\S]*?)<\/h2>/gi;
  const opens = [];
  let m;
  while ((m = openRe.exec(bodyHtml)) !== null) {
    opens.push({
      id: m[2],
      titleHtml: m[4],
      start: m.index,
      openEnd: m.index + m[0].length,
    });
  }
  for (let i = 0; i < opens.length; i++) {
    const o = opens[i];
    const next = opens[i + 1];
    let end;
    if (next) {
      end = next.start;
    } else {
      // 마지막: footer 직전까지
      const footerIdx = bodyHtml.toLowerCase().indexOf('<footer', o.openEnd);
      end = footerIdx > 0 ? footerIdx : bodyHtml.length;
    }
    const inner = bodyHtml.slice(o.openEnd, end);
    topics.push({
      id: o.id,
      title: cleanText(o.titleHtml),
      html: inner,
    });
  }
  return topics;
}

function extractBodyInner(html) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

function extractStyle(html) {
  const blocks = [];
  const re = /<style[^>]*>[\s\S]*?<\/style>/gi;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[0]);
  return blocks.join('\n');
}

const allTopicsIndex = [];

for (const note of NOTES) {
  const srcPath = path.join(DOCS_DIR, note.file);
  if (!fs.existsSync(srcPath)) continue;
  const html = fs.readFileSync(srcPath, 'utf-8');
  const styleHtml = extractStyle(html);
  const bodyHtml = extractBodyInner(html);

  // 1차: <section id> 분해 시도
  let sections = splitByTag(bodyHtml, 'section');

  // 일부 노트(국제법·관세법·국어·영어)는 section 없이 <h2 id>로 단원 구분
  if (sections.length < 5) {
    const h2sections = splitByH2WithId(bodyHtml);
    if (h2sections.length > sections.length) sections = h2sections;
  }

  const noteDir = path.join(OUT_DIR, note.slug, 'topics');
  fs.mkdirSync(noteDir, { recursive: true });

  // 기존 파일 정리 (재실행 시 stale 방지)
  for (const f of fs.readdirSync(noteDir)) {
    if (f.endsWith('.json')) fs.unlinkSync(path.join(noteDir, f));
  }

  const topicsIndex = [];
  for (let idx = 0; idx < sections.length; idx++) {
    const s = sections[idx];
    const title = s.title || extractTitle(s.html);
    if (!title || title.length < 2) continue;
    const keywords = extractKeywords(s.html);
    const freq = extractFreq(s.html);
    const charCount = s.html.replace(/<[^>]+>/g, '').length;

    const topicId = s.id;
    const out = {
      noteSlug: note.slug,
      noteSubject: note.subject,
      topicId,
      ord: idx + 1,
      title,
      keywords,
      freq,
      chars: charCount,
      html: s.html,
      style: styleHtml,
    };
    fs.writeFileSync(path.join(noteDir, `${topicId}.json`), JSON.stringify(out));
    topicsIndex.push({
      topicId,
      ord: idx + 1,
      title,
      keywords: keywords.slice(0, 10),
      freq,
      chars: charCount,
    });
    allTopicsIndex.push({
      noteSlug: note.slug,
      noteSubject: note.subject,
      topicId,
      title,
      keywords: keywords.slice(0, 10),
      freq,
    });
  }

  fs.writeFileSync(
    path.join(OUT_DIR, note.slug, 'topics-index.json'),
    JSON.stringify(topicsIndex, null, 2),
  );
  console.log(`✓ ${note.slug}: ${topicsIndex.length} topics`);
}

fs.writeFileSync(
  path.join(OUT_DIR, 'all-topics-index.json'),
  JSON.stringify(allTopicsIndex, null, 2),
);

console.log(`\n→ 총 ${allTopicsIndex.length} 단원 분해 → ${OUT_DIR}`);
