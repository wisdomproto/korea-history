#!/usr/bin/env node
/**
 * data/projects/index.json 마이그레이션 (2026-04-26):
 *   - 모든 기존 프로젝트에 scope='exam' 추가
 *   - proj-default → examTypeId='korean-history'
 *   - cbt 프로젝트 → examTypeId=categoryCode (사용자가 나중에 정정)
 *   - site-gcnote 프로젝트 (scope='site') 자동 추가 (없으면)
 */
import fs from 'node:fs';

const PATH = 'data/projects/index.json';
const SITE_ID = 'site-gcnote';

const projects = JSON.parse(fs.readFileSync(PATH, 'utf8'));
let changed = false;

// 1. scope 필드 추가
for (const p of projects) {
  if (!p.scope) {
    p.scope = 'exam';
    if (p.id === 'proj-default') p.examTypeId = 'korean-history';
    else if (p.type === 'cbt' && p.categoryCode && !p.examTypeId) {
      p.examTypeId = p.categoryCode;
    }
    changed = true;
  }
}

// 2. site 프로젝트 추가 (없으면)
if (!projects.some((p) => p.id === SITE_ID || p.scope === 'site')) {
  projects.unshift({
    id: SITE_ID,
    name: 'gcnote.co.kr',
    icon: '🌐',
    createdAt: new Date().toISOString(),
    scope: 'site',
    type: 'site',
    brand: {
      name: '기출노트',
      description: '한능검·공무원·자격증 기출 학습 플랫폼',
      tone: '실용적·간결',
    },
  });
  changed = true;
}

if (changed) {
  fs.writeFileSync(PATH, JSON.stringify(projects, null, 2));
  console.log('Migrated', projects.length, 'projects');
  console.log(' site:', projects.filter((p) => p.scope === 'site').length);
  console.log(' exam:', projects.filter((p) => p.scope === 'exam').length);
} else {
  console.log('No migration needed');
}
