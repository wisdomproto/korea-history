#!/usr/bin/env node
/**
 * R2 카테고리 729개를 전수 분류하여 data/exam-types/index.json + data/subjects/index.json에 wire한다.
 *
 * 흐름:
 *   1. category_names.json 로드
 *   2. 기존 wired stems 수집 (정규화: '_'/'-' → '_')
 *   3. 미연결 stem들을 패턴 매칭으로 분류
 *   4. ExamType 그룹별 Subject 생성/append (id, slug, label 모두 결정)
 *   5. 결과 두 JSON 파일에 머지 저장
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CATS_PATH = path.join(ROOT, 'cbt_data/_r2_categories.json');
const EXAM_PATH = path.join(ROOT, 'data/exam-types/index.json');
const SUBJ_PATH = path.join(ROOT, 'data/subjects/index.json');

// R2 _categories.json 형식: [{ name, code, url, examCount, questionCount }, ...]
// `code`가 canonical stem (R2 path).
const r2cats = JSON.parse(fs.readFileSync(CATS_PATH, 'utf8'));
const cats = r2cats.map((c) => ({ name: c.name, stem: c.code }));
const examData = JSON.parse(fs.readFileSync(EXAM_PATH, 'utf8'));
const subjData = JSON.parse(fs.readFileSync(SUBJ_PATH, 'utf8'));

const examTypes = examData.examTypes;
const subjects = subjData.subjects;
const subjectsById = new Map(subjects.map((s) => [s.id, s]));
const examTypeById = new Map(examTypes.map((e) => [e.id, e]));

const norm = (s) => s.replace(/[-_]/g, '_');

// 기존 wired stems
const wiredStems = new Set();
for (const e of examTypes) {
  for (const r of [...e.subjects.required, ...(e.subjects.selectable || [])]) {
    if (r.stem) wiredStems.add(norm(r.stem));
    const s = subjectsById.get(r.subjectId);
    if (s?.questionPool?.stem) wiredStems.add(norm(s.questionPool.stem));
  }
}

// ============================================
// 분류 규칙
// ============================================

/**
 * @typedef {Object} Classification
 * @property {string} examGroupKey  // 그룹화 키 (Korean label)
 * @property {string|null} existingExamId  // 기존 ExamType에 attach
 * @property {string} category  // civil/cert/driver/corporate/language/exam/other
 * @property {string|null} subcategory
 * @property {string} subjectName  // 과목 라벨
 * @property {string} icon
 */

const CIVIL_PATTERNS = [
  // 9급 지방직 서울시 (가장 구체적인 것 먼저)
  {
    re: /^9급\s*지방직\s*공무원\s*서울시\s*(.+)$/,
    examGroupKey: '9급 지방직 공무원 (서울시)',
    examId: null,
    examSlug: '9급-지방직-서울시',
    category: 'civil',
    subcategory: 'civil-9-seoul',
    icon: '🏛️',
    label: '9급 지방직 공무원 (서울시)',
    shortLabel: '9급 서울시',
    description: '서울특별시 9급 공무원 시험. 일반행정·기술직·연구직 53과목.',
  },
  {
    re: /^9급\s*지방직\s*공무원\s*(.+)$/,
    examId: 'civil-9-local',
    category: 'civil',
    subcategory: 'civil-9-direct',
  },
  {
    re: /^9급\s*국가직\s*공무원\s*(.+)$/,
    examId: 'civil-9-national',
    category: 'civil',
    subcategory: 'civil-9-common',
  },
  {
    re: /^7급\s*공무원\s*(.+)$/,
    examId: 'civil-7',
    category: 'civil',
    subcategory: 'civil-7',
  },
  {
    re: /^PSAT\s+(.+)$/,
    examId: 'civil-7',
    category: 'civil',
    subcategory: 'civil-7',
    subjectPrefix: 'PSAT ',
  },
  {
    re: /^계리직\s*공무원\s*(.+)$/,
    examGroupKey: '계리직 공무원',
    examId: null,
    examSlug: '계리직-공무원',
    category: 'civil',
    subcategory: 'civil-postal',
    icon: '🏛️',
    label: '계리직 공무원',
    shortLabel: '계리직',
    description: '우정사업본부 계리직 9급 공무원 시험. 한국사·우편및금융상식·컴퓨터일반 등.',
  },
  {
    re: /^계리직공무원\s*(.+)$/,  // 띄어쓰기 없는 변형
    examGroupKey: '계리직 공무원',
    examId: null,
    examSlug: '계리직-공무원',
    category: 'civil',
    subcategory: 'civil-postal',
    icon: '🏛️',
    label: '계리직 공무원',
    shortLabel: '계리직',
    description: '우정사업본부 계리직 9급 공무원 시험.',
  },
  {
    re: /^경찰공무원\s*(.+)$/,  // (순경) 등 포함
    examId: 'civil-police',
    category: 'civil',
    subcategory: 'civil-special',
  },
  {
    re: /^소방공무원\s*(.+)$/,  // (공개)/(경력) 등 포함
    examId: 'civil-fire',
    category: 'civil',
    subcategory: 'civil-special',
  },
];

// 자격증 그룹별 (umbrella) — 여러 stem 묶음
// 키 = Korean exam label (정확한 prefix), 값 = ExamType 메타
const CERT_UMBRELLAS = {
  '변리사': {
    examSlug: '변리사', subcategory: 'cert-professional', icon: '⚖️', shortLabel: '변리사',
    description: '변리사 1차·2차 시험. 산업재산권법·민법개론·자연과학개론 등.',
  },
  '공인노무사': {
    examSlug: '공인노무사', subcategory: 'cert-professional', icon: '⚖️', shortLabel: '공인노무사',
    description: '공인노무사 1차·2차 시험. 노동법·민법·사회보험법 등.',
  },
  '감정평가사': {
    examSlug: '감정평가사', subcategory: 'cert-realestate', icon: '🏠', shortLabel: '감정평가사',
    description: '감정평가사 1차·2차 시험. 부동산학·민법·회계학·감정평가실무 등.',
  },
  '주택관리사보': {
    examSlug: '주택관리사보', subcategory: 'cert-realestate', icon: '🏠', shortLabel: '주택관리사보',
    description: '주택관리사보 1차·2차 시험. 회계원리·공동주택시설개론·민법 등.',
  },
  '관세사': {
    examSlug: '관세사', subcategory: 'cert-professional', icon: '⚖️', shortLabel: '관세사',
    description: '관세사 시험. 관세법개론·내국소비세법·무역영어·회계학.',
  },
  '경비지도사': {
    examSlug: '경비지도사', subcategory: 'cert-professional', icon: '🛡️', shortLabel: '경비지도사',
    description: '경비지도사 1차·2차 시험. 일반경비/기계경비 분야.',
  },
  '경영지도사': {
    examSlug: '경영지도사', subcategory: 'cert-professional', icon: '⚖️', shortLabel: '경영지도사',
    description: '경영지도사 1차 시험. 경영·인사조직·재무관리·회계 등.',
  },
  '사회복지사 1급': {
    examSlug: '사회복지사-1급', subcategory: 'cert-welfare', icon: '🤝', shortLabel: '사복 1급',
    description: '사회복지사 1급 자격시험. 1·2·3교시 8과목.',
    existingExamId: 'cert-social-worker-1',  // 이미 존재
  },
  '청소년상담사 1급': {
    examSlug: '청소년상담사-1급', subcategory: 'cert-welfare', icon: '🤝', shortLabel: '청소년상담사 1급',
    description: '청소년상담사 1급 자격시험.',
  },
  '청소년상담사 2급': {
    examSlug: '청소년상담사-2급', subcategory: 'cert-welfare', icon: '🤝', shortLabel: '청소년상담사 2급',
    description: '청소년상담사 2급 자격시험.',
  },
  '청소년상담사 3급': {
    examSlug: '청소년상담사-3급', subcategory: 'cert-welfare', icon: '🤝', shortLabel: '청소년상담사 3급',
    description: '청소년상담사 3급 자격시험.',
  },
  'ERP': {
    examSlug: 'ERP', subcategory: 'cert-it', icon: '💼', shortLabel: 'ERP 정보관리사',
    description: 'ERP 정보관리사 (회계·인사·생산·물류).',
  },
  'FAT': {
    examSlug: 'FAT', subcategory: 'cert-labor', icon: '💼', shortLabel: 'FAT',
    description: 'FAT(회계실무) 1·2급 시험.',
  },
  'TAT': {
    examSlug: 'TAT', subcategory: 'cert-labor', icon: '💼', shortLabel: 'TAT',
    description: 'TAT(세무실무) 1·2급 시험.',
  },
  '미용사': {
    examSlug: '미용사', subcategory: 'cert-beauty', icon: '💄', shortLabel: '미용사',
    description: '미용사 자격시험 (일반/피부/네일/메이크업).',
  },
  '비서': {
    examSlug: '비서', subcategory: 'cert-it', icon: '💼', shortLabel: '비서',
    description: '비서 1·2·3급 자격시험.',
  },
  '공인중개사': {
    examSlug: '공인중개사', subcategory: 'cert-realestate', icon: '🏠', shortLabel: '공인중개사',
    description: '공인중개사 1차·2차 시험.',
    existingExamId: 'cert-realtor',
  },
  'DIAT': {
    examSlug: 'DIAT', subcategory: 'cert-it', icon: '💻', shortLabel: 'DIAT',
    description: 'DIAT 디지털정보활용능력 자격시험.',
  },
  '관광통역안내사': {
    examSlug: '관광통역안내사', subcategory: 'cert-tourism', icon: '🗺️', shortLabel: '관광통역사',
    description: '관광통역안내사 자격시험 (외국어·관광법·관광학).',
  },
  '물류관리사': {
    examSlug: '물류관리사', subcategory: 'cert-labor', icon: '📦', shortLabel: '물류관리사',
    description: '물류관리사 자격시험.',
  },
  '전산세무': {
    examSlug: '전산세무', subcategory: 'cert-labor', icon: '💼', shortLabel: '전산세무',
    description: '전산세무 1·2급 자격시험.',
  },
  '전산회계': {
    examSlug: '전산회계', subcategory: 'cert-labor', icon: '💼', shortLabel: '전산회계',
    description: '전산회계 1·2급 자격시험.',
  },
};

// cert subcategory 매핑 (단일 stem ExamType용)
function inferCertSubcategory(name) {
  if (/전기기능|전기산업기사|전기기사|전기기능장|전기설비기사|전력|전기철도|전기공사|전자기기|반도체|전자캐드|발송배전|전자계산기/.test(name)) return 'cert-electrical';
  if (/공조냉동|금형|일반기계|기계설계|기계가공|기계정비|기계.*기[사장능]|컴퓨터응용가공|치공구|광학|선박|용접|배관|판금|기계시공|건설기계.*기[사능]|기관사|항해사/.test(name)) return 'cert-mechanical';
  if (/건축|건설안전|토목|측량|콘크리트|건설재료|도로|지질|광산|지적|건설기계.*설비/.test(name)) return 'cert-construction';
  if (/조경/.test(name)) return 'cert-agri';
  if (/대기환경|수질환경|토양환경|해양환경|폐기물|화공|화약|소음진동|환경|위험물|화학분석/.test(name)) return 'cert-chemistry';
  if (/산업안전|가스|소방시설|소방설비|인간공학/.test(name)) return 'cert-chemistry';
  if (/정보처리|정보보안|정보통신|네트워크|리눅스마스터|컴퓨터활용|사무자동화|MOS|ITQ|SQLD|SQLP|빅데이터|정보보호|컴퓨터시스템|전자계산기조직|전자상거래|GTQ|시각디자인|컬러|그래픽|컴퓨터그래픽/.test(name)) return 'cert-it';
  if (/제과|제빵|한식|양식|중식|일식|복어|바리스타|커피|조주|소믈리에|조리|식품|수산양식|위생사/.test(name)) return 'cert-food';
  if (/이용사|네일|피부/.test(name)) return 'cert-beauty';
  if (/방사선비파괴|초음파비파괴|침투비파괴|자기비파괴|와전류비파괴|누설비파괴|육안비파괴|작업환경|보건|위생|간호|의무|치과|병원|약무|임상병리/.test(name)) return 'cert-medical';
  if (/관광|호텔|컨벤션|여행/.test(name)) return 'cert-tourism';
  if (/농업|원예|화훼|축산|식물|식육|종자|버섯|양봉|곤충|임업|산림|자연환경|환경기능|생물|어로|어업|어획/.test(name)) return 'cert-agri';
  if (/공인중개|부동산|감정평가|손해평가|주택관리/.test(name)) return 'cert-realestate';
  if (/사회복지|청소년상담|직업상담|임상심리|심리/.test(name)) return 'cert-welfare';
  if (/노무|관세|변리|세무|회계|FAT|TAT|재무|소비자|사회조사/.test(name)) return 'cert-labor';
  return 'cert-other';
}

const DRIVER_CONSTRUCTION_RE = /(굴착기|지게차|기중기|타워크레인|컨테이너크레인|천장크레인|로더|불도저|준설선|지반|롤러|모터그레이더|쇼벨로더|양화장치)/;

// ============================================
// classify
// ============================================

function classify(name) {
  const cleaned = name.replace(/^\d+\.\s*/, '').trim();

  // 공무원 패턴
  for (const p of CIVIL_PATTERNS) {
    const m = cleaned.match(p.re);
    if (m) {
      const subjectName = (p.subjectPrefix || '') + m[1].trim();
      const subjLabel = subjectName.replace(/^\(/, '').replace(/\)$/, '').trim();
      return {
        category: p.category,
        subcategory: p.subcategory,
        examGroupKey: p.examGroupKey || examTypeById.get(p.examId)?.label || cleaned,
        existingExamId: p.examId,
        examSlug: p.examSlug,
        examLabel: p.label,
        examShortLabel: p.shortLabel,
        examIcon: p.icon || '🏛️',
        examDescription: p.description,
        subjectName: subjLabel,
      };
    }
  }

  // 수능
  if (/^수능[\s(]/.test(cleaned) || /^수능$/.test(cleaned) || /^모의고사/.test(cleaned)) {
    let sub = cleaned.replace(/^수능\s*/, '').replace(/^[(\(]/, '').replace(/[)\)]$/, '').trim();
    if (!sub) sub = '수능';
    return {
      category: 'exam',
      subcategory: null,
      examGroupKey: '수능',
      existingExamId: null,
      examSlug: '수능',
      examLabel: '수능',
      examShortLabel: '수능',
      examIcon: '🎓',
      examDescription: '대학수학능력시험 기출 (국·수·영·탐구).',
      subjectName: sub,
    };
  }

  // 운전면허
  if (/^운전면허/.test(cleaned)) {
    return {
      category: 'driver',
      subcategory: 'driver-license',
      examGroupKey: '운전면허',
      existingExamId: 'driver-license',
      examSlug: '운전면허',
      examLabel: '운전면허',
      examShortLabel: '운전면허',
      examIcon: '🚗',
      examDescription: '운전면허 학과시험 (1종/2종).',
      subjectName: cleaned,
    };
  }

  // 건설기계 운전 (각각 별개 ExamType)
  if (DRIVER_CONSTRUCTION_RE.test(cleaned)) {
    return {
      category: 'driver',
      subcategory: 'driver-construction',
      examGroupKey: cleaned,
      existingExamId: null,
      examSlug: slugify(cleaned),
      examLabel: cleaned,
      examShortLabel: cleaned,
      examIcon: '🚜',
      examDescription: `${cleaned} 자격시험.`,
      subjectName: cleaned,
    };
  }

  // 인적성 / 어학 별도 처리
  if (/^(GSAT|NCS|직업기초능력|직업적성|인적성)/.test(cleaned)) {
    return {
      category: 'corporate',
      subcategory: null,
      examGroupKey: cleaned.split(/[\s(]/)[0],
      existingExamId: null,
      examSlug: slugify(cleaned.split(/[\s(]/)[0]),
      examLabel: cleaned.split(/[\s(]/)[0],
      examShortLabel: cleaned.split(/[\s(]/)[0],
      examIcon: '🏢',
      examDescription: `${cleaned.split(/[\s(]/)[0]} 인적성 시험.`,
      subjectName: cleaned,
    };
  }
  if (/^(TOEIC|TOEFL|TOPIK|FLEX|국어능력|한국어능력|G-TELP|텝스|TEPS)/.test(cleaned)) {
    const head = cleaned.split(/[\s(]/)[0];
    return {
      category: 'language',
      subcategory: null,
      examGroupKey: head,
      existingExamId: null,
      examSlug: slugify(head),
      examLabel: head,
      examShortLabel: head,
      examIcon: '🌐',
      examDescription: `${head} 어학 시험.`,
      subjectName: cleaned,
    };
  }

  // Cert umbrella 검사 (가장 긴 prefix 우선)
  const umbrellaKeys = Object.keys(CERT_UMBRELLAS).sort((a, b) => b.length - a.length);
  for (const key of umbrellaKeys) {
    if (cleaned.startsWith(key)) {
      const remainder = cleaned.slice(key.length).trim();
      let subjectName = remainder
        .replace(/^[(\(]/, '')
        .replace(/[)\)]$/, '')
        .trim();
      if (!subjectName) subjectName = key;
      const u = CERT_UMBRELLAS[key];
      return {
        category: 'cert',
        subcategory: u.subcategory,
        examGroupKey: key,
        existingExamId: u.existingExamId || null,
        examSlug: u.examSlug,
        examLabel: key,
        examShortLabel: u.shortLabel,
        examIcon: u.icon,
        examDescription: u.description,
        subjectName,
      };
    }
  }

  // 기본: 단일 stem = 단일 ExamType + 단일 Subject (자격증 인 경우 cert, 아니면 other)
  const subcat = inferCertSubcategory(cleaned);
  const isCert = subcat !== 'cert-other' || /기능사|산업기사|기능장|기사|^정보|^자동차|^한식|^양식|^네일|^피부|^이용/.test(cleaned);

  return {
    category: isCert ? 'cert' : 'other',
    subcategory: isCert ? subcat : null,
    examGroupKey: cleaned,
    existingExamId: null,
    examSlug: slugify(cleaned),
    examLabel: cleaned,
    examShortLabel: cleaned.length > 12 ? cleaned.slice(0, 12) + '…' : cleaned,
    examIcon: pickIconFromSubcat(subcat),
    examDescription: `${cleaned} 시험.`,
    subjectName: cleaned,
  };
}

function pickIconFromSubcat(s) {
  const m = {
    'cert-electrical': '⚡',
    'cert-mechanical': '⚙️',
    'cert-construction': '🏗️',
    'cert-chemistry': '🧪',
    'cert-it': '💻',
    'cert-food': '🍳',
    'cert-beauty': '💄',
    'cert-tourism': '🗺️',
    'cert-medical': '🩺',
    'cert-agri': '🌱',
    'cert-realestate': '🏠',
    'cert-welfare': '🤝',
    'cert-labor': '💼',
    'cert-professional': '⚖️',
  };
  return m[s] || '📋';
}

function slugify(s) {
  return s
    .replace(/\s+/g, '-')
    .replace(/[(\(\)\)]/g, '')
    .replace(/[/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================
// 분류 실행
// ============================================

const grouped = new Map(); // examGroupKey → { meta, stems: [{stem, subjectName, originalName}] }
const stats = { wired: 0, classified: 0, byCategory: {} };

for (const c of cats) {
  const stem = c.stem;
  if (wiredStems.has(norm(stem))) {
    stats.wired++;
    continue;
  }
  const cls = classify(c.name);
  stats.classified++;
  stats.byCategory[cls.category] = (stats.byCategory[cls.category] || 0) + 1;

  const key = cls.examGroupKey;
  if (!grouped.has(key)) grouped.set(key, { meta: cls, stems: [] });
  grouped.get(key).stems.push({ stem, subjectName: cls.subjectName, originalName: c.name });
}

console.log('\n=== 분류 통계 ===');
console.log('이미 wired:', stats.wired);
console.log('분류 대상:', stats.classified);
console.log('카테고리별:');
for (const [k, v] of Object.entries(stats.byCategory)) {
  console.log(`  ${k.padEnd(10)} ${v}`);
}
console.log('생성될 ExamType 그룹:', grouped.size);

// ============================================
// 머지
// ============================================

let nextSubjectIdSeq = subjects.length + 1;
let createdExamTypes = 0;
let createdSubjects = 0;
let appendedRefs = 0;

function ensureSubject(name) {
  // name → subject id (Latin if known shared, else subj-{name})
  const slug = slugify(name);
  // Check existing by slug
  let s = subjects.find((x) => x.slug === slug || x.label === name);
  if (s) return s;
  const id = `subj-${slug}`;
  s = {
    id,
    slug,
    label: name,
    shortLabel: name.length > 8 ? name.slice(0, 8) + '…' : name,
    status: 'live',
    description: '',
    phase: 1,
  };
  subjects.push(s);
  subjectsById.set(id, s);
  createdSubjects++;
  nextSubjectIdSeq++;
  return s;
}

function ensureExamType(meta) {
  // existingExamId 가 있으면 그 ExamType, 없으면 examGroupKey 매칭으로 찾고 없으면 신규
  if (meta.existingExamId) {
    const e = examTypeById.get(meta.existingExamId);
    if (e) return e;
  }
  const candidate = examTypes.find(
    (e) => e.label === meta.examLabel || e.slug === meta.examSlug,
  );
  if (candidate) return candidate;

  // 신규 ExamType 생성
  const id = generateExamTypeId(meta);
  const order = examTypes.length + 1;
  const newExam = {
    id,
    slug: meta.examSlug,
    label: meta.examLabel,
    shortLabel: meta.examShortLabel,
    icon: meta.examIcon,
    category: meta.category,
    subcategory: meta.subcategory,
    status: 'live',
    highlight: false,
    featured: false,
    order,
    popularityScore: 50,
    audience: [],
    subjects: { required: [], selectable: [] },
    description: meta.examDescription,
    seo: {
      title: `${meta.examLabel} 기출 — 기출노트`,
      description: `${meta.examLabel} 기출문제 풀이 + 자동 오답노트.`,
      keywords: [meta.examLabel, `${meta.examLabel} 기출`],
    },
    routes: {
      main: `/${meta.examSlug}`,
      exam: `/${meta.examSlug}/exam`,
    },
  };
  examTypes.push(newExam);
  examTypeById.set(id, newExam);
  createdExamTypes++;
  return newExam;
}

function generateExamTypeId(meta) {
  // 충돌 안 나는 id 생성: {category}-{slug-ascii-or-counter}
  let baseId = `${meta.category}-${asciifyOrIndex(meta.examSlug)}`;
  let id = baseId;
  let suffix = 2;
  while (examTypeById.has(id)) {
    id = `${baseId}-${suffix++}`;
  }
  return id;
}

function asciifyOrIndex(s) {
  // 한글이면 hash 기반 짧은 ID, ASCII면 그대로
  if (/^[\x20-\x7E-]+$/.test(s)) return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  // 한글: 간단 hash → 6자
  let hash = 0;
  for (const ch of s) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `auto-${hash.toString(36).slice(0, 6)}`;
}

// 그룹 처리
for (const [groupKey, group] of grouped) {
  const examType = ensureExamType(group.meta);
  for (const { stem, subjectName } of group.stems) {
    // Subject 보장
    const subject = ensureSubject(subjectName);
    // questionPool.stem 설정 (없으면)
    if (!subject.questionPool) {
      subject.questionPool = { stem, status: 'live' };
    }
    // SubjectRef 추가
    const refs = examType.subjects.required.concat(examType.subjects.selectable || []);
    const exists = refs.some((r) => r.subjectId === subject.id && norm(r.stem || subject.questionPool?.stem || '') === norm(stem));
    if (!exists) {
      examType.subjects.selectable = examType.subjects.selectable || [];
      examType.subjects.selectable.push({ subjectId: subject.id, status: 'live', stem });
      appendedRefs++;
    }
  }
}

// ============================================
// 저장
// ============================================

examData.examTypes = examTypes;
examData.updatedAt = new Date().toISOString().slice(0, 10);
subjData.subjects = subjects;
subjData.updatedAt = new Date().toISOString().slice(0, 10);

fs.writeFileSync(EXAM_PATH, JSON.stringify(examData, null, 2) + '\n', 'utf8');
fs.writeFileSync(SUBJ_PATH, JSON.stringify(subjData, null, 2) + '\n', 'utf8');

console.log('\n=== 결과 ===');
console.log('새 ExamType:', createdExamTypes);
console.log('새 Subject:', createdSubjects);
console.log('새 SubjectRef:', appendedRefs);
console.log('총 ExamTypes:', examTypes.length);
console.log('총 Subjects:', subjects.length);
console.log('\n저장 완료.');
