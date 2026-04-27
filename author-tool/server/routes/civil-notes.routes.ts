/**
 * 9급 공무원 자동 단권화 노트 편집 API.
 *
 * 13개 docs/{slug}-summary-note.html 파일을 직접 read/write.
 * - GET /api/civil-notes — 인덱스 (slug, subject, chars, mtime)
 * - GET /api/civil-notes/:slug — 전체 HTML
 * - PUT /api/civil-notes/:slug — 전체 HTML 저장
 *
 * 저장 후엔 docs/ → web/data/civil-notes/ 동기화는 web/scripts/sync-civil-notes.mjs +
 * web/scripts/sync-civil-topics.mjs 가 담당. Vercel 배포 빌드 단계에서 자동 실행.
 */
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const DOCS_DIR = path.resolve(__dirname, '../../../docs');

const NOTES = [
  { slug: 'admin-law', file: 'admin-law-summary-note.html', subject: '행정법총론', icon: '⚖️' },
  { slug: 'admin-pa', file: 'admin-pa-summary-note.html', subject: '행정학개론', icon: '🏛️' },
  { slug: 'criminal-law', file: 'criminal-law-summary-note.html', subject: '형법총론', icon: '⚖️' },
  { slug: 'criminal-procedure', file: 'criminal-procedure-summary-note.html', subject: '형사소송법개론', icon: '👮' },
  { slug: 'accounting', file: 'accounting-summary-note.html', subject: '회계학', icon: '📊' },
  { slug: 'tax-law', file: 'tax-law-summary-note.html', subject: '세법개론', icon: '💰' },
  { slug: 'corrections', file: 'corrections-summary-note.html', subject: '교정학개론', icon: '🔒' },
  { slug: 'social-welfare', file: 'social-welfare-summary-note.html', subject: '사회복지학개론', icon: '🤝' },
  { slug: 'education', file: 'education-summary-note.html', subject: '교육학개론', icon: '🎓' },
  { slug: 'international-law', file: 'international-law-summary-note.html', subject: '국제법개론', icon: '🌐' },
  { slug: 'customs-law', file: 'customs-law-summary-note.html', subject: '관세법개론', icon: '🛂' },
  { slug: 'korean', file: 'korean-summary-note.html', subject: '국어', icon: '📖' },
  { slug: 'english', file: 'english-summary-note.html', subject: '영어', icon: '🔤' },
  { slug: 'constitution', file: 'constitution-summary-note.html', subject: '헌법', icon: '⚖️' },
  { slug: 'engineer-info-processing', file: 'engineer-info-processing-summary-note.html', subject: '정보처리기사', icon: '💻' },
  { slug: 'industrial-safety-engineer', file: 'industrial-safety-engineer-summary-note.html', subject: '산업안전기사', icon: '🦺' },
  { slug: 'realtor-1', file: 'realtor-1-summary-note.html', subject: '공인중개사 1차', icon: '🏠' },
  { slug: 'realtor-2', file: 'realtor-2-summary-note.html', subject: '공인중개사 2차', icon: '🏘️' },
  { slug: 'computer-skills-1', file: 'computer-skills-1-summary-note.html', subject: '컴퓨터활용능력 1급', icon: '🖥️' },
  { slug: 'accounting-cert-1', file: 'accounting-cert-1-summary-note.html', subject: '전산회계 1급', icon: '🧾' },
  { slug: 'electrical-engineer', file: 'electrical-engineer-summary-note.html', subject: '전기기사', icon: '⚡' },
  { slug: 'social-research-2', file: 'social-research-2-summary-note.html', subject: '사회조사분석사 2급', icon: '📊' },
  { slug: 'career-counselor-2', file: 'career-counselor-2-summary-note.html', subject: '직업상담사 2급', icon: '💼' },
];

router.get('/', (_req, res) => {
  const index = NOTES.map((n) => {
    const full = path.join(DOCS_DIR, n.file);
    if (!fs.existsSync(full)) {
      return { ...n, exists: false, chars: 0, mtime: null };
    }
    const stat = fs.statSync(full);
    return {
      ...n,
      exists: true,
      chars: stat.size,
      mtime: stat.mtime.toISOString(),
    };
  });
  res.json(index);
});

router.get('/:slug', (req, res) => {
  const note = NOTES.find((n) => n.slug === req.params.slug);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  const full = path.join(DOCS_DIR, note.file);
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'File not found' });
  const html = fs.readFileSync(full, 'utf-8');
  const stat = fs.statSync(full);
  res.json({
    ...note,
    html,
    chars: stat.size,
    mtime: stat.mtime.toISOString(),
  });
});

router.put('/:slug', (req, res) => {
  const note = NOTES.find((n) => n.slug === req.params.slug);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const { html } = req.body as { html?: string };
  if (typeof html !== 'string' || html.length < 100) {
    return res.status(400).json({ error: 'Invalid html (min 100 chars)' });
  }
  // Sanity check — must have <html> + <body>
  if (!/<html[\s>]/i.test(html) || !/<body[\s>]/i.test(html)) {
    return res.status(400).json({ error: 'HTML must include <html> and <body>' });
  }

  const full = path.join(DOCS_DIR, note.file);
  fs.writeFileSync(full, html, 'utf-8');
  const stat = fs.statSync(full);

  res.json({
    ...note,
    chars: stat.size,
    mtime: stat.mtime.toISOString(),
    saved: true,
  });
});

export default router;
