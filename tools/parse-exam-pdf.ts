/**
 * 기출문제 PDF 파싱 도구
 *
 * 사용법:
 *   npx ts-node tools/parse-exam-pdf.ts <pdf-text-file> <exam-number> <exam-date>
 *
 * 예시:
 *   npx ts-node tools/parse-exam-pdf.ts input/exam-75.txt 75 2025-06-14
 *
 * 1단계: PDF에서 텍스트를 추출 (외부 도구 또는 MCP read_pdf_content 사용)
 * 2단계: 이 스크립트로 텍스트를 구조화된 JSON으로 변환
 * 3단계: 이미지가 필요한 문제는 저작도구에서 수동 보완
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── 타입 ───

interface ParsedQuestion {
  questionNumber: number;
  content: string;       // 질문 텍스트
  choices: string[];     // 5개 선지
  points: number;        // 배점
  hasImage: boolean;     // 이미지 필요 여부 (수동 보완 필요)
  hasChoiceImages: boolean; // 보기가 이미지인지
  rawText: string;       // 원본 텍스트 (디버깅용)
}

interface ParsedExam {
  exam: {
    examNumber: number;
    examDate: string;
    examType: 'advanced' | 'basic';
    totalQuestions: number;
    timeLimitMinutes: number;
    isFree: boolean;
  };
  questions: ParsedQuestion[];
  needsManualReview: number[]; // 수동 검토 필요한 문항 번호
}

// ─── 파서 ───

function parseExamText(text: string, examNumber: number, examDate: string): ParsedExam {
  const questions: ParsedQuestion[] = [];
  const needsManualReview: number[] = [];

  // 문제 블록 분리: "1." ~ "2." 패턴으로 나누기
  // 한국사능력검정시험 문제는 "번호." 패턴으로 시작
  const questionPattern = /(?:^|\n)\s*(\d{1,2})\.\s/g;
  const matches: { index: number; num: number }[] = [];

  let match;
  while ((match = questionPattern.exec(text)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 50) {
      matches.push({ index: match.index, num });
    }
  }

  // 각 문제 블록 추출
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const block = text.slice(start, end).trim();
    const qNum = matches[i].num;

    // 이미 파싱된 번호는 스킵 (중복 방지)
    if (questions.some((q) => q.questionNumber === qNum)) continue;

    const parsed = parseQuestionBlock(block, qNum);
    if (parsed) {
      questions.push(parsed);
      if (parsed.hasImage || parsed.hasChoiceImages || parsed.choices.length < 5) {
        needsManualReview.push(qNum);
      }
    }
  }

  // 번호순 정렬
  questions.sort((a, b) => a.questionNumber - b.questionNumber);

  return {
    exam: {
      examNumber,
      examDate,
      examType: examNumber >= 1 ? 'advanced' : 'basic', // 기본값
      totalQuestions: questions.length,
      timeLimitMinutes: 70,
      isFree: true,
    },
    questions,
    needsManualReview,
  };
}

function parseQuestionBlock(block: string, qNum: number): ParsedQuestion | null {
  // 배점 추출 [1점], [2점], [3점]
  const pointsMatch = block.match(/\[(\d)점\]/);
  const points = pointsMatch ? parseInt(pointsMatch[1]) : 2;

  // 선지 추출: ①②③④⑤ 또는 1~5 번호
  const choicePattern = /[①②③④⑤]/g;
  const hasCircledNumbers = choicePattern.test(block);

  let choices: string[] = [];
  let questionPart = block;

  if (hasCircledNumbers) {
    // ①②③④⑤ 패턴으로 선지 분리
    const circled = ['①', '②', '③', '④', '⑤'];
    const positions: { symbol: string; index: number; num: number }[] = [];

    for (let c = 0; c < circled.length; c++) {
      let searchFrom = 0;
      let pos;
      while ((pos = block.indexOf(circled[c], searchFrom)) !== -1) {
        positions.push({ symbol: circled[c], index: pos, num: c + 1 });
        searchFrom = pos + 1;
      }
    }

    // 마지막 출현 세트를 선지로 사용 (문제 텍스트에도 번호가 나올 수 있으므로)
    if (positions.length >= 5) {
      // 가장 아래쪽 ①을 찾아서 그 이후를 선지 영역으로 사용
      const lastSet = findLastChoiceSet(positions);
      if (lastSet.length === 5) {
        for (let c = 0; c < 5; c++) {
          const start = lastSet[c].index + lastSet[c].symbol.length;
          const end = c < 4 ? lastSet[c + 1].index : block.length;
          choices.push(block.slice(start, end).trim().replace(/\s+/g, ' '));
        }
        questionPart = block.slice(0, lastSet[0].index).trim();
      }
    }
  }

  // 선지가 못 찾아지면 대체 패턴 시도
  if (choices.length < 5) {
    // "1  텍스트" "2  텍스트" 패턴
    choices = [];
    // Fall through — 수동 검토 필요
  }

  // 질문 텍스트 추출 (passage text is no longer used — source materials are image-only)
  let content = questionPart;

  // 문제 번호 제거
  content = content.replace(/^\d{1,2}\.\s*/, '').trim();
  // 배점 태그 제거
  content = content.replace(/\[[\d]점\]/, '').trim();

  // 이미지 필요 여부 판단
  const hasImage = /그림|사진|지도|초상화|삽화|유적|유물|문화유산|특별전|▲/.test(block);
  const hasChoiceImages = choices.length >= 5 && choices.some((c) => c.length < 3);

  return {
    questionNumber: qNum,
    content: content || `문제 ${qNum}`,
    choices,
    points,
    hasImage,
    hasChoiceImages,
    rawText: block.slice(0, 500),
  };
}

function findLastChoiceSet(
  positions: { symbol: string; index: number; num: number }[],
): { symbol: string; index: number; num: number }[] {
  // 뒤에서부터 ⑤④③②① 순서로 찾기
  const result: { symbol: string; index: number; num: number }[] = [];

  for (let target = 5; target >= 1; target--) {
    const candidates = positions.filter((p) => p.num === target);
    if (candidates.length === 0) return [];
    result.unshift(candidates[candidates.length - 1]); // 마지막(가장 아래) 것
  }

  // 순서 검증: ① < ② < ③ < ④ < ⑤ (인덱스 순)
  for (let i = 1; i < result.length; i++) {
    if (result[i].index <= result[i - 1].index) {
      return []; // 순서가 맞지 않으면 실패
    }
  }

  return result;
}

// ─── 출력 포맷 변환 ───

function toAppFormat(
  parsed: ParsedExam,
  startId: number,
): {
  exam: any;
  questions: any[];
} {
  const examId = Math.floor(startId / 1000) || parsed.exam.examNumber;

  return {
    exam: {
      id: examId,
      ...parsed.exam,
    },
    questions: parsed.questions.map((q, i) => ({
      id: startId + i,
      examId,
      questionNumber: q.questionNumber,
      content: q.content,
      imageUrl: q.hasImage ? `TODO_ADD_IMAGE_URL` : undefined,
      choices: q.choices.length === 5 ? q.choices : ['선지1', '선지2', '선지3', '선지4', '선지5'],
      choiceImages: q.hasChoiceImages ? ['TODO', 'TODO', 'TODO', 'TODO', 'TODO'] : undefined,
      correctAnswer: 0, // ★ 정답은 수동 입력 필요!
      points: q.points,
      era: '근대' as const, // ★ 시대 태깅은 수동 또는 AI로
      category: '정치' as const, // ★ 유형 태깅은 수동 또는 AI로
      difficulty: 2 as const,
    })),
  };
}

// ─── CLI ───

function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('사용법: npx ts-node tools/parse-exam-pdf.ts <텍스트파일> <회차번호> <시험일>');
    console.log('예시:   npx ts-node tools/parse-exam-pdf.ts input/exam-75.txt 75 2025-06-14');
    process.exit(1);
  }

  const [inputFile, examNumStr, examDate] = args;
  const examNumber = parseInt(examNumStr);

  if (!fs.existsSync(inputFile)) {
    console.error(`파일을 찾을 수 없습니다: ${inputFile}`);
    process.exit(1);
  }

  const text = fs.readFileSync(inputFile, 'utf-8');
  console.log(`📄 입력 파일: ${inputFile} (${text.length}자)`);

  const parsed = parseExamText(text, examNumber, examDate);
  console.log(`✅ 파싱된 문제: ${parsed.questions.length}문항`);
  console.log(`⚠️  수동 검토 필요: ${parsed.needsManualReview.length}문항 — [${parsed.needsManualReview.join(', ')}]`);

  // 결과 저장
  const outputDir = path.join(__dirname, '..', 'data', 'questions');
  const outputFile = path.join(outputDir, `exam-${examNumber}.json`);
  const appData = toAppFormat(parsed, examNumber * 1000);

  fs.writeFileSync(outputFile, JSON.stringify(appData, null, 2), 'utf-8');
  console.log(`💾 저장: ${outputFile}`);

  // 파싱 리포트
  const reportFile = path.join(__dirname, `report-exam-${examNumber}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(parsed, null, 2), 'utf-8');
  console.log(`📋 파싱 리포트: ${reportFile}`);

  // 요약
  console.log('\n─── 요약 ───');
  parsed.questions.forEach((q) => {
    const status = q.choices.length === 5 ? '✅' : '❌';
    const img = q.hasImage ? '🖼️' : '  ';
    console.log(
      `  ${status} Q${String(q.questionNumber).padStart(2, '0')} [${q.points}점] ${img} 선지${q.choices.length}개 | ${q.content.slice(0, 40)}...`,
    );
  });
}

main();
