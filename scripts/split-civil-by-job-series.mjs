#!/usr/bin/env node
/**
 * 공무원 시험을 직렬별 ExamType으로 분리.
 *
 * 부모 ExamType (9급-국가직, 9급-지방직, 9급-지방직-서울시)을 유지하면서
 * 각 직렬을 별도 ExamType으로 추가.
 *
 * 공통 과목 (한국사/국어/영어)은 모든 직렬에 required로 자동 추가.
 */

import fs from 'node:fs';

const examData = JSON.parse(fs.readFileSync('data/exam-types/index.json', 'utf8'));
const subjData = JSON.parse(fs.readFileSync('data/subjects/index.json', 'utf8'));
const subjectsById = new Map(subjData.subjects.map((s) => [s.id, s]));
const subjectsByLabel = new Map(subjData.subjects.map((s) => [s.label, s]));

// ============================================
// 직렬 매핑 — 직렬 ID → { 라벨, 과목 라벨 리스트 }
// ============================================

const JOB_SERIES = [
  { id: 'haengjeong', label: '일반행정', icon: '📋', subjects: ['행정학개론', '행정법총론', '사회', '과학', '수학'] },
  { id: 'tax', label: '세무', icon: '💰', subjects: ['세법개론', '회계학', '회계원리'] },
  { id: 'customs', label: '관세', icon: '📦', subjects: ['관세법개론', '회계학'] },
  { id: 'stats', label: '통계', icon: '📊', subjects: ['통계학개론', '경제학개론'] },
  { id: 'prosecution', label: '검찰사무', icon: '⚖️', subjects: ['형법', '형사소송법', '형법총론', '형사소송법개론'] },
  { id: 'correction', label: '교정', icon: '🛡️', subjects: ['교정학개론', '형사소송법'] },
  { id: 'protection', label: '보호', icon: '🤝', subjects: ['형사정책', '사회복지학개론'] },
  { id: 'welfare', label: '사회복지', icon: '🤝', subjects: ['사회복지학개론'] },
  { id: 'counsel', label: '직업상담', icon: '💬', subjects: ['직업상담심리학개론', '노동법개론'] },
  { id: 'edu', label: '교육행정', icon: '🎓', subjects: ['교육학개론'] },
  { id: 'foreign', label: '외무영사', icon: '🌐', subjects: ['국제법개론'] },
  { id: 'election', label: '선거행정', icon: '🗳️', subjects: ['공직선거법'] },
  { id: 'building', label: '건축', icon: '🏗️', subjects: ['건축계획', '건축구조'] },
  { id: 'civilEng', label: '토목', icon: '🌉', subjects: ['응용역학개론', '토목설계'] },
  { id: 'machine', label: '일반기계', icon: '⚙️', subjects: ['기계일반', '기계설계'] },
  { id: 'elec', label: '전기', icon: '⚡', subjects: ['전기이론', '전기기기'] },
  { id: 'telecom', label: '통신기술', icon: '📡', subjects: ['무선공학개론', '전자공학개론', '통신이론'] },
  { id: 'chemical', label: '화공', icon: '🧪', subjects: ['공업화학', '화학공학일반'] },
  { id: 'it', label: '전산', icon: '💻', subjects: ['컴퓨터일반'] },
  { id: 'infosec', label: '정보보호', icon: '🔒', subjects: ['정보보호론', '네트워크보안', '정보시스템보안'] },
  { id: 'forestry', label: '임업', icon: '🌲', subjects: ['임업경영', '조림'] },
  { id: 'food', label: '식품위생', icon: '🌾', subjects: ['식용작물', '재배학개론'] },
  { id: 'landscape', label: '조경', icon: '🌿', subjects: ['조경계획및설계', '조경학', '조경계획및생태관리'] },
  { id: 'safety', label: '방재안전', icon: '🚨', subjects: ['안전관리론', '재난관리론'] },
  { id: 'library', label: '사서', icon: '📚', subjects: ['자료조직개론', '정보봉사개론'] },
  { id: 'nursing', label: '간호', icon: '🩺', subjects: ['간호관리', '간호관리(8급)', '지역사회간호학', '지역사회간호', '의료관계법규', '공중보건', '보건행정'] },
  { id: 'cadastre', label: '지적', icon: '🗺️', subjects: ['지적전산학개론', '지적측량', '지적법규', '수학(지적)'] },
  { id: 'env', label: '환경', icon: '🌱', subjects: ['환경공학개론', '화학', '물리', '생물'] },
  { id: 'navy', label: '선박항해', icon: '🚢', subjects: ['선박일반', '항해', '자동차구조원리', '자동차구조원리(유공자)'] },
  { id: 'localTax', label: '지방세', icon: '💰', subjects: ['지방세법'] },
  { id: 'specialVeteran', label: '유공자 특별', icon: '🎖️', subjects: ['사회(유공자)', '한국사(유공자)', '자동차구조원리(유공자)'] },
];

const COMMON_SUBJECTS = ['한국사', '국어', '영어']; // 모든 직렬 공통

// ============================================
// 부모 ExamType 정의
// ============================================

const PARENTS = [
  {
    parentSlug: '9급-국가직',
    parentId: 'civil-9-national',
    subcategory: 'civil-9-direct',
    childIdPrefix: 'civil-9n',
    childSlugPrefix: '9급-국가직',
    icon: '🏛️',
    examLabelPrefix: '9급 국가직',
  },
  {
    parentSlug: '9급-지방직',
    parentId: 'civil-9-local',
    subcategory: 'civil-9-direct',
    childIdPrefix: 'civil-9l',
    childSlugPrefix: '9급-지방직',
    icon: '🏛️',
    examLabelPrefix: '9급 지방직',
  },
  {
    parentSlug: '9급-지방직-서울시',
    parentId: null, // auto-id, slug 기반 lookup
    subcategory: 'civil-9-seoul',
    childIdPrefix: 'civil-9s',
    childSlugPrefix: '9급-지방직-서울시',
    icon: '🏛️',
    examLabelPrefix: '9급 서울시',
  },
];

// ============================================
// 헬퍼
// ============================================

const examTypeBySlug = new Map(examData.examTypes.map((e) => [e.slug, e]));

function findParent(p) {
  if (p.parentId) {
    const e = examData.examTypes.find((x) => x.id === p.parentId);
    if (e) return e;
  }
  return examTypeBySlug.get(p.parentSlug);
}

function findSubject(label) {
  return subjectsByLabel.get(label) || subjectsById.get(`subj-${label}`);
}

// ============================================
// 분리 실행
// ============================================

const stats = {
  parentsProcessed: 0,
  childrenCreated: 0,
  refsAttached: 0,
  unmatched: [],
};

for (const p of PARENTS) {
  const parent = findParent(p);
  if (!parent) {
    console.log(`[SKIP] Parent not found: ${p.parentSlug}`);
    continue;
  }
  stats.parentsProcessed++;

  // 부모의 모든 SubjectRef → label로 매핑
  const parentRefs = [...parent.subjects.required, ...(parent.subjects.selectable || [])];
  const refByLabel = new Map();
  for (const r of parentRefs) {
    const subj = subjectsById.get(r.subjectId);
    if (!subj) continue;
    refByLabel.set(subj.label, { ref: r, subj });
  }

  // 공통 ref 추출
  const commonRefs = [];
  for (const cs of COMMON_SUBJECTS) {
    const item = refByLabel.get(cs);
    if (item) commonRefs.push(item.ref);
  }

  // 직렬별 child ExamType 생성
  const matchedLabels = new Set(COMMON_SUBJECTS);

  for (const job of JOB_SERIES) {
    const matchedRefs = [];
    for (const subjectLabel of job.subjects) {
      const item = refByLabel.get(subjectLabel);
      if (item) {
        matchedRefs.push(item.ref);
        matchedLabels.add(subjectLabel);
      }
    }
    if (matchedRefs.length === 0) continue; // 이 직렬엔 과목 없음

    const childId = `${p.childIdPrefix}-${job.id}`;
    const childSlug = `${p.childSlugPrefix}-${job.label}`;
    if (examTypeBySlug.has(childSlug) || examData.examTypes.find((x) => x.id === childId)) {
      // 이미 존재 → skip
      continue;
    }

    const newExam = {
      id: childId,
      slug: childSlug,
      label: `${p.examLabelPrefix} ${job.label}직`,
      shortLabel: `${job.label}직`,
      icon: job.icon,
      category: 'civil',
      subcategory: p.subcategory,
      status: 'live',
      highlight: false,
      featured: false,
      order: examData.examTypes.length + stats.childrenCreated + 1,
      popularityScore: 60,
      audience: ['공무원 응시생'],
      parentExamId: parent.id, // 부모 참조 (UI에서 활용)
      jobSeries: job.id,
      subjects: {
        required: commonRefs.map((r) => ({ ...r })),
        selectable: matchedRefs.map((r) => ({ ...r })),
      },
      description: `${p.examLabelPrefix} ${job.label}직 시험. 한국사·국어·영어 + ${job.label} 직렬 전공과목.`,
      seo: {
        title: `${p.examLabelPrefix} ${job.label}직 기출 — 기출노트`,
        description: `${p.examLabelPrefix} ${job.label}직 시험 기출문제 + 자동 오답노트.`,
        keywords: [`${p.examLabelPrefix} ${job.label}`, `${job.label}직`, `${job.label}직 기출`],
      },
      routes: {
        main: `/${childSlug}`,
        exam: `/${childSlug}/exam`,
      },
    };
    examData.examTypes.push(newExam);
    examTypeBySlug.set(childSlug, newExam);
    stats.childrenCreated++;
    stats.refsAttached += matchedRefs.length + commonRefs.length;
  }

  // 매칭 안 된 과목들 → "기타" 직렬
  const unmatchedRefs = [];
  for (const [label, item] of refByLabel) {
    if (!matchedLabels.has(label)) {
      unmatchedRefs.push(item.ref);
      stats.unmatched.push({ parent: p.parentSlug, label });
    }
  }
  if (unmatchedRefs.length > 0) {
    const childId = `${p.childIdPrefix}-other`;
    const childSlug = `${p.childSlugPrefix}-기타`;
    if (!examTypeBySlug.has(childSlug)) {
      const newExam = {
        id: childId,
        slug: childSlug,
        label: `${p.examLabelPrefix} 기타직렬`,
        shortLabel: '기타직렬',
        icon: '📋',
        category: 'civil',
        subcategory: p.subcategory,
        status: 'live',
        highlight: false,
        featured: false,
        order: examData.examTypes.length + stats.childrenCreated + 1,
        popularityScore: 30,
        audience: [],
        parentExamId: parent.id,
        jobSeries: 'other',
        subjects: {
          required: commonRefs.map((r) => ({ ...r })),
          selectable: unmatchedRefs.map((r) => ({ ...r })),
        },
        description: `${p.examLabelPrefix} 기타 직렬 (분류되지 않은 과목들).`,
        seo: {
          title: `${p.examLabelPrefix} 기타 — 기출노트`,
          description: `${p.examLabelPrefix} 기타 직렬 시험 기출.`,
          keywords: [`${p.examLabelPrefix}`, '기타'],
        },
        routes: {
          main: `/${childSlug}`,
          exam: `/${childSlug}/exam`,
        },
      };
      examData.examTypes.push(newExam);
      examTypeBySlug.set(childSlug, newExam);
      stats.childrenCreated++;
      stats.refsAttached += unmatchedRefs.length + commonRefs.length;
    }
  }

  // 부모는 컨테이너로 — subjects는 그대로 둠 (나중에 UI에서 직렬 카드 보여주기)
  // 단, parentExamId 자체에 isContainer 플래그
  parent.isContainer = true;
}

// ============================================
// 저장
// ============================================

examData.updatedAt = new Date().toISOString().slice(0, 10);
fs.writeFileSync('data/exam-types/index.json', JSON.stringify(examData, null, 2) + '\n');

console.log('=== 분리 결과 ===');
console.log('처리된 부모 ExamType:', stats.parentsProcessed);
console.log('생성된 직렬 ExamType:', stats.childrenCreated);
console.log('연결된 SubjectRef:', stats.refsAttached);
console.log('미분류 과목 (기타로 묶임):', stats.unmatched.length);

if (stats.unmatched.length > 0) {
  console.log('\n--- 미분류 과목 샘플 ---');
  const grouped = {};
  for (const u of stats.unmatched) {
    grouped[u.parent] = grouped[u.parent] || [];
    grouped[u.parent].push(u.label);
  }
  for (const [k, v] of Object.entries(grouped)) {
    console.log(` ${k}: ${v.length}개 → ${v.slice(0, 5).join(', ')}${v.length > 5 ? '...' : ''}`);
  }
}
