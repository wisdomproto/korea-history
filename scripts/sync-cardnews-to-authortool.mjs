#!/usr/bin/env node
/**
 * data/cardnews-drafts/{noteId}.json → 저작도구 instagram 채널로 PUT.
 *
 * 매핑:
 *   noteId → contentId (저작도구 컨텐츠 sourceId 기반)
 *   디자인 가이드 6장 (cover/keywords/facts/people/impact/outro)
 *     → InstagramSlide[6]
 *
 * Usage: node scripts/sync-cardnews-to-authortool.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const API = 'http://localhost:3001/api';
const PROJECT_ID = 'proj-default';
const DRAFTS_DIR = 'data/cardnews-drafts';
const CHANNEL_CONTENT_ID = 'ig-design-A';

function buildSlidesFromGuide(d) {
  // 디자인 가이드 6장을 InstagramSlide[]로 변환
  const c = d.cover;
  const k = d.keywords;
  const f = d.facts;
  const p = d.people;
  const i = d.impact;
  const o = d.outro;

  return [
    {
      id: 'sl-01-cover',
      type: 'hook',
      _designType: 'cover',
      title: c.title_lines.join(' '),
      body: `${c.era_chip}\n\n${c.subtitle}`,
      textOverlay: c.title_lines.join(' '),
      imagePrompt: c.imagePrompt || '',
    },
    {
      id: 'sl-02-keywords',
      type: 'content',
      _designType: 'keywords',
      title: k.headline.join(' '),
      body: k.items.map((item) => `• ${item.word} — ${item.sub}`).join('\n'),
      textOverlay: k.headline.join(' '),
    },
    {
      id: 'sl-03-facts',
      type: 'content',
      _designType: 'facts',
      title: `${f.headline_top} ${f.headline_accent}`,
      body: f.timeline
        .map((t) => `${t.year} ${t.month ? '(' + t.month + ')' : ''} — ${t.text}`)
        .join('\n'),
      textOverlay: `${f.headline_top} ${f.headline_accent}`,
    },
    {
      id: 'sl-04-people',
      type: 'content',
      _designType: 'people',
      title: `${p.headline_top} ${p.headline_accent}`,
      body: p.items.map((it) => `• ${it.name} (${it.role}) — ${it.desc}`).join('\n'),
      textOverlay: `${p.headline_top} ${p.headline_accent}`,
    },
    {
      id: 'sl-05-impact',
      type: 'content',
      _designType: 'impact',
      title: i.headline.join(' '),
      body: i.items.map((it) => `${it.title} — ${it.desc}`).join('\n'),
      textOverlay: i.headline.join(' '),
    },
    {
      id: 'sl-06-outro',
      type: 'cta',
      _designType: 'outro',
      title: o.tip_headline.replace(/\n/g, ' '),
      body:
        o.tip_body +
        '\n\n시대별 요약노트 87편과 회차별 기출문제 풀이까지,\n' +
        '한능검 합격을 위한 모든 학습은 한 곳에서.\n\n' +
        '전체 학습 → gcnote.co.kr\n@기출노트 한능검 — 매일 한 장',
      textOverlay: o.tip_headline.replace(/\n/g, ' '),
      imagePrompt: o.imagePrompt || '',
    },
  ];
}

function buildCaption(d) {
  const c = d.cover;
  const o = d.outro;
  const kw = d.keywords.items.map((k) => k.word).join(' · ');
  const tip = o.tip_body.split('.')[0] + '.';
  return [
    `${d.meta.topic} (${d.meta.year_label})`,
    '',
    c.subtitle.replace(/\n/g, ' '),
    '',
    `핵심: ${kw}`,
    `시험 포인트: ${tip}`,
    '',
    '전체 노트: gcnote.co.kr',
    `다음편: ${d.meta.next_topic}`,
  ].join('\n');
}

function buildHashtags(d) {
  const base = ['한국사', '한능검', '기출노트', '한국사능력검정시험', '공무원한국사'];
  const era = d.meta.era;
  const topicTag = d.meta.topic.replace(/\s+/g, '');
  return [...base, era, topicTag].filter((t) => t && t.length < 20);
}

async function main() {
  // 1. 모든 컨텐츠 fetch (sourceId → contentId 매핑용)
  const allRes = await fetch(`${API}/contents`);
  const all = await allRes.json();
  const list = Array.isArray(all) ? all : all.data || [];
  const noteToContentId = new Map();
  for (const c of list) {
    if (c.projectId === PROJECT_ID && c.sourceType === 'note' && c.sourceId) {
      noteToContentId.set(c.sourceId, c.id);
    }
  }
  console.log(`매핑된 노트→컨텐츠: ${noteToContentId.size}`);

  // 2. drafts 폴더의 파일들
  const files = fs
    .readdirSync(DRAFTS_DIR)
    .filter((f) => /^s\d/.test(f) && f.endsWith('.json'));
  console.log(`드래프트 파일: ${files.length}`);

  let done = 0;
  let skipped = 0;
  for (const file of files) {
    const noteId = file.replace('.json', '');
    const contentId = noteToContentId.get(noteId);
    if (!contentId) {
      console.log(`  ✗ ${noteId} — 매칭되는 contentId 없음`);
      skipped++;
      continue;
    }

    const draft = JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, file), 'utf8'));
    const d = draft.data;
    if (!d) {
      console.log(`  ✗ ${noteId} — data 필드 없음`);
      skipped++;
      continue;
    }

    // 기존 채널 fetch — slide.imageUrl 보존용 (실제 경로: data.instagram[])
    const existingImagesById = new Map();
    try {
      const exRes = await fetch(`${API}/contents/${contentId}`);
      if (exRes.ok) {
        const exJson = await exRes.json();
        const igList = (exJson.data || exJson).instagram || [];
        const exIg = igList.find((c) => c.id === CHANNEL_CONTENT_ID);
        if (exIg && Array.isArray(exIg.slides)) {
          for (const s of exIg.slides) if (s.imageUrl) existingImagesById.set(s.id, s.imageUrl);
        }
      }
    } catch {}

    const slides = buildSlidesFromGuide(d).map((s) => {
      const url = existingImagesById.get(s.id);
      return url ? { ...s, imageUrl: url } : s;
    });
    const igContent = {
      id: CHANNEL_CONTENT_ID,
      contentId,
      caption: buildCaption(d),
      hashtags: buildHashtags(d),
      slides,
      templateId: 'design-guide-A',
      textModelId: 'manual',
      imageModelId: 'gemini-imagen-3',
      // 디자인 가이드 풀 데이터도 보존 (저작도구에서 정밀 렌더링 필요할 때)
      _designGuide: {
        schemaVersion: 'design-guide-A v1',
        meta: d.meta,
        raw: d,
      },
    };

    const url = `${API}/contents/${contentId}/channels/instagram/${CHANNEL_CONTENT_ID}`;
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(igContent),
    });
    if (putRes.ok) {
      done++;
      console.log(`  ✓ ${noteId} → ${contentId}`);
    } else {
      const err = await putRes.text();
      console.log(`  ✗ ${noteId} — ${err.slice(0, 120)}`);
    }
  }

  console.log('\n=== 완료 ===');
  console.log(`업로드: ${done}/${files.length}`);
  if (skipped > 0) console.log(`skip: ${skipped}`);
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
