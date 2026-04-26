#!/usr/bin/env node
/**
 * 카드뉴스 템플릿 시드:
 *   1. 기존 깨진 템플릿 모두 삭제
 *   2. 디자인 가이드 A 톤 빌트인 템플릿 4개 추가
 *      (페이퍼·다크·앰버 강조·미니멀)
 */
const API = 'http://localhost:3001/api';

// 디자인 가이드 A 팔레트
const T = {
  bg: '#F2EDE3', paper: '#FAF6EC', ink: '#1A1612', ink2: '#3A3128',
  subtle: '#7A6B5A', hairline: '#E2D8C6', accent: '#C77B3D', dark: '#15110D',
};

// 4개 템플릿
const TEMPLATES = [
  {
    name: '페이퍼 (기본)',
    canvas: {
      bgColor: T.bg, imageUrl: null, imageY: 50,
      textBlocks: [
        { id: 'title', text: '', x: 6, y: 14, fontSize: 88, color: T.ink, fontWeight: 'bold', textAlign: 'left', width: 88, shadow: false },
        { id: 'body',  text: '', x: 6, y: 42, fontSize: 44, color: T.ink2, fontWeight: 'normal', textAlign: 'left', width: 88, shadow: false },
        { id: 'brand', text: '● 기출노트 한능검 · gcnote.co.kr', x: 6, y: 92, fontSize: 18, color: T.subtle, fontWeight: 'normal', textAlign: 'left', width: 88, shadow: false },
      ],
    },
  },
  {
    name: '다크 (시험 포인트)',
    canvas: {
      bgColor: T.dark, imageUrl: null, imageY: 50,
      textBlocks: [
        { id: 'title', text: '', x: 6, y: 14, fontSize: 88, color: '#F5EFE2', fontWeight: 'bold', textAlign: 'left', width: 88, shadow: false },
        { id: 'body',  text: '', x: 6, y: 42, fontSize: 42, color: 'rgba(245,239,226,0.85)', fontWeight: 'normal', textAlign: 'left', width: 88, shadow: false },
        { id: 'brand', text: '● 기출노트 한능검 · gcnote.co.kr', x: 6, y: 92, fontSize: 18, color: 'rgba(245,239,226,0.5)', fontWeight: 'normal', textAlign: 'left', width: 88, shadow: false },
      ],
    },
  },
  {
    name: '앰버 강조 (커버)',
    canvas: {
      bgColor: T.bg, imageUrl: null, imageY: 50,
      textBlocks: [
        { id: 'meta',  text: 'HISTORY · 한국사', x: 6, y: 6, fontSize: 18, color: T.subtle, fontWeight: 'bold', textAlign: 'left', width: 88, shadow: false },
        { id: 'title', text: '', x: 6, y: 22, fontSize: 120, color: T.ink, fontWeight: 'bold', textAlign: 'left', width: 88, shadow: false },
        { id: 'body',  text: '', x: 6, y: 70, fontSize: 36, color: T.accent, fontWeight: 'bold', textAlign: 'left', width: 88, shadow: false },
        { id: 'brand', text: '● 기출노트 한능검 · gcnote.co.kr', x: 6, y: 92, fontSize: 18, color: T.subtle, fontWeight: 'normal', textAlign: 'left', width: 88, shadow: false },
      ],
    },
  },
  {
    name: '한지 미니멀 (본문)',
    canvas: {
      bgColor: T.paper, imageUrl: null, imageY: 50,
      textBlocks: [
        { id: 'title', text: '', x: 6, y: 18, fontSize: 72, color: T.ink, fontWeight: 'bold', textAlign: 'left', width: 88, shadow: false },
        { id: 'body',  text: '', x: 6, y: 44, fontSize: 40, color: T.ink2, fontWeight: 'normal', textAlign: 'left', width: 88, shadow: false },
        { id: 'brand', text: '● 기출노트 한능검 · gcnote.co.kr', x: 6, y: 92, fontSize: 18, color: T.subtle, fontWeight: 'normal', textAlign: 'left', width: 88, shadow: false },
      ],
    },
  },
];

async function main() {
  // 1. 기존 다 삭제
  console.log('=== 기존 템플릿 삭제 ===');
  const listRes = await fetch(`${API}/cardnews-templates`);
  const list = (await listRes.json()).data || [];
  console.log(`기존: ${list.length}개`);
  for (const t of list) {
    const r = await fetch(`${API}/cardnews-templates/${t.id}`, { method: 'DELETE' });
    console.log(`  ${r.ok ? '✓' : '✗'} ${t.id}`);
  }

  // 2. 새 템플릿 4개 추가
  console.log('\n=== 빌트인 템플릿 4개 추가 ===');
  for (const t of TEMPLATES) {
    const r = await fetch(`${API}/cardnews-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: t.name, canvas: t.canvas }),
    });
    if (r.ok) {
      const data = (await r.json()).data;
      console.log(`  ✓ ${data.name} → ${data.id}`);
    } else {
      console.log(`  ✗ ${t.name}: ${await r.text()}`);
    }
  }
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1); });
