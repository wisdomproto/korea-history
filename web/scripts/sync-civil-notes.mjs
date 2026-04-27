// docs/{slug}-summary-note.html → web/data/civil-notes/{slug}.json
// MVP: <body> 안 본문 추출 + <style> 보존 + h2 단원 목록 추출

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../../docs');
const OUT_DIR = path.resolve(__dirname, '../data/civil-notes');

const NOTES = [
  { slug: 'admin-law', file: 'admin-law-summary-note.html', subject: '행정법총론', icon: '⚖️', subtitle: '행정의 일반원칙·처분·구제 28단원' },
  { slug: 'admin-pa', file: 'admin-pa-summary-note.html', subject: '행정학개론', icon: '🏛️', subtitle: '정책·인사·재무·조직 13단원' },
  { slug: 'criminal-law', file: 'criminal-law-summary-note.html', subject: '형법총론', icon: '⚖️', subtitle: '공범·미수·위법성·죄수 14단원' },
  { slug: 'criminal-procedure', file: 'criminal-procedure-summary-note.html', subject: '형사소송법개론', icon: '👮', subtitle: '증거·수사·공판·상소 15단원' },
  { slug: 'accounting', file: 'accounting-summary-note.html', subject: '회계학', icon: '📊', subtitle: 'K-IFRS + 정부회계 12단원' },
  { slug: 'tax-law', file: 'tax-law-summary-note.html', subject: '세법개론', icon: '💰', subtitle: '법인세·소득세·부가세 10단원' },
  { slug: 'corrections', file: 'corrections-summary-note.html', subject: '교정학개론', icon: '🔒', subtitle: '형집행·범죄학 11단원' },
  { slug: 'social-welfare', file: 'social-welfare-summary-note.html', subject: '사회복지학개론', icon: '🤝', subtitle: '정책·실천·복지국가 13단원' },
  { slug: 'education', file: 'education-summary-note.html', subject: '교육학개론', icon: '🎓', subtitle: '심리·행정·과정 13단원' },
  { slug: 'international-law', file: 'international-law-summary-note.html', subject: '국제법개론', icon: '🌐', subtitle: 'UN·조약·해양·WTO 14단원' },
  { slug: 'customs-law', file: 'customs-law-summary-note.html', subject: '관세법개론', icon: '🛂', subtitle: '통관·과세·보세 10단원' },
  { slug: 'korean', file: 'korean-summary-note.html', subject: '국어', icon: '📖', subtitle: 'PSAT형 독해·어휘 9단원 (공통)' },
  { slug: 'english', file: 'english-summary-note.html', subject: '영어', icon: '🔤', subtitle: '어휘 100선 + 어법 9단원 (공통)' },
  { slug: 'constitution', file: 'constitution-summary-note.html', subject: '헌법', icon: '⚖️', subtitle: '5급 PSAT·7급·법원직 / 15단원' },
  // 자격증
  { slug: 'engineer-info-processing', file: 'engineer-info-processing-summary-note.html', subject: '정보처리기사', icon: '💻', subtitle: 'SDLC·DB·네트워크·보안 / 10단원' },
  { slug: 'industrial-safety-engineer', file: 'industrial-safety-engineer-summary-note.html', subject: '산업안전기사', icon: '🦺', subtitle: '안전관리·산안법·인간공학 / 10단원' },
  { slug: 'realtor-1', file: 'realtor-1-summary-note.html', subject: '공인중개사 1차', icon: '🏠', subtitle: '부동산학·민법 / 10단원' },
  { slug: 'realtor-2', file: 'realtor-2-summary-note.html', subject: '공인중개사 2차', icon: '🏘️', subtitle: '공법·세법·중개실무 / 10단원' },
  { slug: 'computer-skills-1', file: 'computer-skills-1-summary-note.html', subject: '컴퓨터활용능력 1급', icon: '🖥️', subtitle: 'Excel·Access·일반 / 10단원' },
  { slug: 'accounting-cert-1', file: 'accounting-cert-1-summary-note.html', subject: '전산회계 1급', icon: '🧾', subtitle: '회계·원가·부가세 / 10단원' },
  { slug: 'electrical-engineer', file: 'electrical-engineer-summary-note.html', subject: '전기기사', icon: '⚡', subtitle: '전기자기·전력·기기·회로 / 10단원' },
  { slug: 'social-research-2', file: 'social-research-2-summary-note.html', subject: '사회조사분석사 2급', icon: '📊', subtitle: '조사방법·통계·SPSS / 10단원' },
  { slug: 'career-counselor-2', file: 'career-counselor-2-summary-note.html', subject: '직업상담사 2급', icon: '💼', subtitle: '진로이론·검사·노동시장 / 10단원' },
];

function extractBetween(html, openTag, closeTag) {
  const i = html.indexOf(openTag);
  if (i < 0) return '';
  const start = i;
  const j = html.indexOf(closeTag, start);
  if (j < 0) return '';
  return html.slice(start, j + closeTag.length);
}

function extractStyle(html) {
  const blocks = [];
  const re = /<style[^>]*>[\s\S]*?<\/style>/gi;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[0]);
  return blocks.join('\n');
}

function extractBodyInner(html) {
  // <body ...>...</body> 내부만 추출. 없으면 전체 반환.
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

function extractTopics(html) {
  // h2의 텍스트만 추출 (단원 리스트)
  const topics = [];
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text && text.length < 80) topics.push(text);
  }
  return topics;
}

function extractKeywords(html) {
  // 빈출 키워드 추출: <strong> 태그 안 짧은 명사구 (4~12자)
  const set = new Set();
  const re = /<strong[^>]*>([^<]{2,30})<\/strong>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const t = m[1].replace(/[「『｢」』｣().,:;]/g, '').trim();
    if (t.length >= 3 && t.length <= 14 && /[가-힣]/.test(t) && !/^\d/.test(t)) {
      set.add(t);
    }
  }
  return [...set].slice(0, 60);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const index = [];
for (const note of NOTES) {
  const srcPath = path.join(DOCS_DIR, note.file);
  if (!fs.existsSync(srcPath)) {
    console.log(`✗ ${note.slug}: ${srcPath} 없음`);
    continue;
  }
  const html = fs.readFileSync(srcPath, 'utf-8');
  const styleHtml = extractStyle(html);
  const bodyHtml = extractBodyInner(html);
  const topics = extractTopics(bodyHtml);
  const keywords = extractKeywords(bodyHtml);

  const out = {
    slug: note.slug,
    subject: note.subject,
    icon: note.icon,
    subtitle: note.subtitle,
    examSlug: '9급-국가직',
    examLabel: '9급 국가직 공무원',
    topics,
    keywords,
    style: styleHtml,
    body: bodyHtml,
    chars: bodyHtml.length,
    updated: '2026-04-27',
  };

  fs.writeFileSync(
    path.join(OUT_DIR, `${note.slug}.json`),
    JSON.stringify(out)
  );
  index.push({
    slug: note.slug,
    subject: note.subject,
    icon: note.icon,
    subtitle: note.subtitle,
    examSlug: '9급-국가직',
    examLabel: '9급 국가직 공무원',
    topics: topics.length,
    keywords: keywords.length,
    chars: bodyHtml.length,
    updated: '2026-04-27',
  });
  console.log(`✓ ${note.slug}: ${topics.length} topics, ${keywords.length} keywords, ${bodyHtml.length} chars`);
}

fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));
console.log(`\n→ ${index.length}개 노트 → ${OUT_DIR}`);
