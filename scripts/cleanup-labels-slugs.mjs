#!/usr/bin/env node
/**
 * 자동 분류 후처리 정리:
 *   1. 깨진 라벨 (unbalanced parens) → 표준 형식
 *   2. Slug 특수문자 (`,` `ㆍ` 등) → 안전한 slug
 *   3. 중복 subject slug → unique 보장
 *   4. shortLabel 너무 길면 자름
 *
 * 단, ExamType slug 변경은 라우트 영향 큼 → 보수적으로 한 가지만 (driver-construction comma).
 */

import fs from 'node:fs';

const examData = JSON.parse(fs.readFileSync('data/exam-types/index.json', 'utf8'));
const subjData = JSON.parse(fs.readFileSync('data/subjects/index.json', 'utf8'));

// ============================================
// 라벨 정규화
// ============================================

function normalizeLabel(label) {
  let s = label.trim();
  // "1차(법학개론,민간경비론" → "1차 (법학개론·민간경비론)"
  // "공개,경력) 영어(구" → "(공개·경력) 영어 (구버전)"
  // "간호관리(8급" → "간호관리 (8급)"
  // "1급(구" → "1급 (구버전)"
  // "공개) 한국사(구" → "(공개) 한국사 (구버전)"

  // 1단계: 등호/콤마 → 점(·) - "공개,경력" 처럼
  s = s.replace(/,(?=[가-힣])/g, '·');

  // 2단계: leading "X)" → "(X)" 패턴 복원
  // "공개) 한국사" → "(공개) 한국사"
  // "공개·경력) 영어" → "(공개·경력) 영어"
  s = s.replace(/^([가-힣·]+)\)\s+/, '($1) ');

  // 3단계: 마지막의 "X(구" → "X (구버전)"
  s = s.replace(/\s*\(구\s*$/, ' (구버전)');

  // 4단계: "X(Y" 미닫힘 (단, 이미 닫힌건 제외)
  // 닫는 괄호가 없으면 추가
  const opens = (s.match(/\(/g) || []).length;
  const closes = (s.match(/\)/g) || []).length;
  if (opens > closes) {
    s = s + ')'.repeat(opens - closes);
  } else if (closes > opens) {
    s = '('.repeat(closes - opens) + s;
  }

  // 5단계: 공백 정리
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ============================================
// Slug 정규화
// ============================================

const FORBIDDEN_SLUG_CHAR = /[,ㆍ.()<>{}'"\\\/\s%#?&=]/g;

function normalizeSlug(slug) {
  return slug
    .replace(/ㆍ/g, '')          // Korean middle dot 제거
    .replace(/[,]/g, '-')        // 쉼표 → 하이픈
    .replace(FORBIDDEN_SLUG_CHAR, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================
// shortLabel 자름
// ============================================

function shortenLabel(label) {
  if (label.length <= 14) return label;
  return label.slice(0, 14) + '…';
}

// ============================================
// 적용
// ============================================

const stats = {
  labelFixed: 0,
  slugFixed: 0,
  shortLabelFixed: 0,
  examSlugFixed: 0,
  duplicateSlugFixed: 0,
};

// Subjects
const seenSlugs = new Set();
for (const s of subjData.subjects) {
  const oldLabel = s.label;
  const newLabel = normalizeLabel(oldLabel);
  if (newLabel !== oldLabel) {
    s.label = newLabel;
    if (s.description?.includes(oldLabel)) {
      s.description = s.description.replace(oldLabel, newLabel);
    }
    stats.labelFixed++;
  }

  const oldSlug = s.slug;
  const newSlug = normalizeSlug(oldSlug);
  if (newSlug !== oldSlug) {
    s.slug = newSlug;
    stats.slugFixed++;
  }

  // 중복 slug 처리
  if (seenSlugs.has(s.slug)) {
    // suffix 붙이기
    let counter = 2;
    let candidate = `${s.slug}-${counter}`;
    while (seenSlugs.has(candidate)) {
      counter++;
      candidate = `${s.slug}-${counter}`;
    }
    s.slug = candidate;
    stats.duplicateSlugFixed++;
  }
  seenSlugs.add(s.slug);

  const oldShort = s.shortLabel;
  const newShort = shortenLabel(s.label);
  if (newShort !== oldShort) {
    s.shortLabel = newShort;
    stats.shortLabelFixed++;
  }
}

// ExamTypes (slug만 — 변경 부담 적게)
const seenExamSlugs = new Set();
for (const e of examData.examTypes) {
  const oldSlug = e.slug;
  const newSlug = normalizeSlug(oldSlug);
  if (newSlug !== oldSlug) {
    e.slug = newSlug;
    // routes도 업데이트
    e.routes.main = `/${e.slug}`;
    if (e.routes.exam) e.routes.exam = `/${e.slug}/exam`;
    if (e.routes.notes) e.routes.notes = `/${e.slug}/notes`;
    if (e.routes.study) e.routes.study = `/${e.slug}/study`;
    if (e.routes.wrongAnswers) e.routes.wrongAnswers = `/${e.slug}/wrong-answers`;
    if (e.routes.record) e.routes.record = `/${e.slug}/my-record`;
    stats.examSlugFixed++;
  }

  // 중복 ExamType slug 처리 (이번엔 거의 없을 것)
  if (seenExamSlugs.has(e.slug)) {
    let counter = 2;
    let candidate = `${e.slug}-${counter}`;
    while (seenExamSlugs.has(candidate)) {
      counter++;
      candidate = `${e.slug}-${counter}`;
    }
    e.slug = candidate;
    e.routes.main = `/${candidate}`;
  }
  seenExamSlugs.add(e.slug);
}

// 저장
examData.updatedAt = new Date().toISOString().slice(0, 10);
subjData.updatedAt = new Date().toISOString().slice(0, 10);
fs.writeFileSync('data/exam-types/index.json', JSON.stringify(examData, null, 2) + '\n');
fs.writeFileSync('data/subjects/index.json', JSON.stringify(subjData, null, 2) + '\n');

console.log('=== 정리 결과 ===');
console.log(' Subject 라벨 수정:', stats.labelFixed);
console.log(' Subject slug 수정:', stats.slugFixed);
console.log(' Subject shortLabel 수정:', stats.shortLabelFixed);
console.log(' Subject 중복 slug 해결:', stats.duplicateSlugFixed);
console.log(' ExamType slug 수정:', stats.examSlugFixed);
