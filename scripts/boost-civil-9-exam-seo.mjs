#!/usr/bin/env node
/**
 * 9급 공무원 ExamType의 seo 필드를 패턴 D로 보강.
 * 기존 seo가 자동 생성 thin 상태 → title/description/keywords 재생성.
 * idempotent: 재실행해도 keywords는 dedupe, title/desc는 템플릿 재생성.
 *
 * 패턴 D = 한능검 검증 "{시험} + 수식어" 키워드 (단원별 정리 / 요약 / 정리본 등).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "exam-types", "index.json");

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
if (!Array.isArray(data.examTypes)) {
  console.error("✗ examTypes 배열을 찾지 못함");
  process.exit(1);
}

const is9 = (e) =>
  String(e.id || "").includes("civil-9") || String(e.slug || "").includes("9급");

let updated = 0;
for (const e of data.examTypes) {
  if (!is9(e)) continue;
  const base = e.label;
  const title = `${base} 기출문제 무료 — 단원별 정리·회차별 풀이`;
  const description = `${base} 기출문제와 단원별 요약정리를 무료로. 회차별 풀이 + 자동 오답노트 + 학습 기록 — 기출노트.`;
  const patternD = [
    base,
    `${base} 기출`,
    `${base} 기출문제`,
    `${base} 단원별 정리`,
    `${base} 요약`,
    `${base} 정리본`,
    "9급 공무원",
    "공무원 기출문제",
  ];
  const existing = Array.isArray(e.seo?.keywords) ? e.seo.keywords : [];
  e.seo = {
    title,
    description,
    keywords: Array.from(new Set([...existing, ...patternD])),
  };
  updated++;
}

data.updatedAt = "2026-05-14";
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(
  `✅ 9급 ExamType ${updated}개 seo 보강 완료 → ${path.relative(process.cwd(), DATA_PATH)}`,
);
