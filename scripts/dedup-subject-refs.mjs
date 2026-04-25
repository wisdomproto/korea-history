#!/usr/bin/env node
/**
 * 같은 ExamType 안에서 동일 subjectId 가 중복되면 dedup.
 * 우선순위:
 *   1. required[stem 없음] 우선 (한국사처럼 한능검 콘텐츠 reuse)
 *   2. required[stem 있음]
 *   3. selectable[stem 있음]
 *   4. selectable[stem 없음]
 */
import fs from 'node:fs';

const examData = JSON.parse(fs.readFileSync('data/exam-types/index.json', 'utf8'));

let removed = 0;
function refScore(r, isRequired) {
  // 한국사는 stem 없는 ref가 best (한능검 콘텐츠 사용)
  if (r.subjectId === 'korean-history') {
    if (isRequired && !r.stem) return 100;
    if (isRequired && r.stem) return 50;
    if (!isRequired && !r.stem) return 30;
    return 10;
  }
  // 그 외: required > selectable, stem 있는 게 더 유용
  if (isRequired && r.stem) return 100;
  if (isRequired && !r.stem) return 80;
  if (!isRequired && r.stem) return 60;
  return 40;
}

for (const e of examData.examTypes) {
  const reqs = e.subjects.required.map((r) => ({ r, isReq: true }));
  const sels = (e.subjects.selectable || []).map((r) => ({ r, isReq: false }));
  const all = [...reqs, ...sels];

  const bySubject = new Map();
  for (const item of all) {
    const list = bySubject.get(item.r.subjectId) || [];
    list.push(item);
    bySubject.set(item.r.subjectId, list);
  }

  // 중복 있는 subjectId 처리
  const keep = new Set(); // (Set of items to keep)
  for (const [sid, list] of bySubject) {
    if (list.length === 1) {
      keep.add(list[0]);
      continue;
    }
    list.sort((a, b) => refScore(b.r, b.isReq) - refScore(a.r, a.isReq));
    keep.add(list[0]);
    removed += list.length - 1;
  }

  e.subjects.required = reqs.filter((it) => keep.has(it)).map((it) => it.r);
  e.subjects.selectable = sels.filter((it) => keep.has(it)).map((it) => it.r);
}

examData.updatedAt = new Date().toISOString().slice(0, 10);
fs.writeFileSync('data/exam-types/index.json', JSON.stringify(examData, null, 2) + '\n');

console.log('중복 제거된 SubjectRef:', removed);
