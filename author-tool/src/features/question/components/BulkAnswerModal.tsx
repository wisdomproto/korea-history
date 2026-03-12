import { useState, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { useBulkUpdateAnswers } from '../hooks/useQuestions';

interface BulkAnswerModalProps {
  open: boolean;
  onClose: () => void;
  examId: number;
  questionCount: number;
}

const CIRCLE_MAP: Record<string, number> = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5 };
const CIRCLE_LABELS = ['', '①', '②', '③', '④', '⑤'];

interface ParsedAnswer {
  questionNumber: number;
  correctAnswer: number;
  points?: number;
}

/**
 * Parse answer table text from Korean history exam answer sheets.
 * Supports formats like:
 *   문항 번호 정답 배점 문항 번호 정답 배점
 *   1 ② 1 11 ③ 3 21 ④ 3
 *   2 ⑤ 2 12 ① 2 22 ③ 1
 * Also supports: "12345", "1 2 3 4 5", "①②③④⑤" etc.
 */
function parseAnswerText(input: string, expectedCount: number): ParsedAnswer[] {
  const text = input.trim();
  if (!text) return [];

  // Remove header lines containing "문항" or "번호" or "정답" or "배점"
  const lines = text.split('\n').filter(
    (l) => !/문항|번호|정답|배점/.test(l) && l.trim().length > 0,
  );
  const cleaned = lines.join(' ');

  // Strategy 1a: Table format with circle chars — (number)(circle)(number) repeating
  const tablePattern = /(\d+)\s*([①②③④⑤])\s*(\d+)/g;
  const tableResults: ParsedAnswer[] = [];
  let m;
  while ((m = tablePattern.exec(cleaned)) !== null) {
    const qNum = parseInt(m[1]);
    const answer = CIRCLE_MAP[m[2]];
    const pts = parseInt(m[3]);
    if (qNum >= 1 && qNum <= 100 && answer >= 1 && answer <= 5 && pts >= 1 && pts <= 3) {
      tableResults.push({ questionNumber: qNum, correctAnswer: answer, points: pts });
    }
  }
  if (tableResults.length >= expectedCount * 0.5) {
    const seen = new Set<number>();
    return tableResults.filter((r) => {
      if (seen.has(r.questionNumber)) return false;
      seen.add(r.questionNumber);
      return true;
    }).sort((a, b) => a.questionNumber - b.questionNumber);
  }

  // Strategy 1b: Numeric table — repeating (questionNumber answer points) all as digits
  // e.g. "1 2 1 11 5 2 21 3 2 ..." from pasted answer sheets
  const nums = cleaned.split(/\s+/).map(Number).filter((n) => !isNaN(n));
  if (nums.length >= 9 && nums.length % 3 === 0) {
    const numResults: ParsedAnswer[] = [];
    for (let i = 0; i < nums.length; i += 3) {
      const qNum = nums[i], answer = nums[i + 1], pts = nums[i + 2];
      if (qNum >= 1 && qNum <= 100 && answer >= 1 && answer <= 5 && pts >= 1 && pts <= 3) {
        numResults.push({ questionNumber: qNum, correctAnswer: answer, points: pts });
      }
    }
    if (numResults.length >= expectedCount * 0.5) {
      const seen = new Set<number>();
      return numResults.filter((r) => {
        if (seen.has(r.questionNumber)) return false;
        seen.add(r.questionNumber);
        return true;
      }).sort((a, b) => a.questionNumber - b.questionNumber);
    }
  }

  // Strategy 2: Circle numbers only ①②③④⑤
  const circles = cleaned.match(/[①②③④⑤]/g);
  if (circles && circles.length >= expectedCount * 0.5) {
    return circles.slice(0, expectedCount).map((c, i) => ({
      questionNumber: i + 1,
      correctAnswer: CIRCLE_MAP[c],
    }));
  }

  // Strategy 3: Space/comma separated digits "1 2 3 4 5" or "1,2,3,4,5"
  const separated = cleaned.split(/[\s,;.\-/|]+/).map((s) => s.trim()).filter(Boolean);
  if (separated.every((s) => /^[1-5]$/.test(s)) && separated.length >= expectedCount * 0.5) {
    return separated.slice(0, expectedCount).map((s, i) => ({
      questionNumber: i + 1,
      correctAnswer: parseInt(s),
    }));
  }

  // Strategy 4: Consecutive digits "12345..."
  const digitsOnly = cleaned.replace(/\s+/g, '');
  if (/^[1-5]+$/.test(digitsOnly) && digitsOnly.length >= expectedCount * 0.5) {
    return digitsOnly.split('').slice(0, expectedCount).map((d, i) => ({
      questionNumber: i + 1,
      correctAnswer: parseInt(d),
    }));
  }

  return [];
}

export function BulkAnswerModal({ open, onClose, examId, questionCount }: BulkAnswerModalProps) {
  const [text, setText] = useState('');
  const mutation = useBulkUpdateAnswers();

  const parsed = useMemo(() => parseAnswerText(text, questionCount), [text, questionCount]);
  const isValid = parsed.length > 0;
  const hasPoints = parsed.some((p) => p.points !== undefined);

  const handleSubmit = () => {
    console.log('[BulkAnswer] submit', { examId, parsedCount: parsed.length, first3: parsed.slice(0, 3) });
    mutation.mutate(
      { examId, answers: parsed },
      {
        onSuccess: (data) => {
          console.log('[BulkAnswer] success, updated:', Array.isArray(data) ? data.length : data);
          setText('');
          onClose();
        },
        onError: (err: any) => {
          console.error('[BulkAnswer] error:', err?.message || err);
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="정답 일괄입력" maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
            placeholder={`정답표를 붙여넣으세요.\n\n예시 1 (원문자 테이블):\n1 ② 1  11 ③ 3  21 ④ 3\n\n예시 2 (숫자 테이블 — 번호 정답 배점):\n1 2 1  11 5 2  21 3 2\n\n예시 3 (원문자만): ②⑤②①③...\n\n예시 4 (숫자만): 2 5 2 1 3...`}
          />
        </div>

        {/* Parse result */}
        {text.trim() && (
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {isValid ? (
                  <span className="text-green-700">
                    {parsed.length}개 파싱됨 {hasPoints && '(배점 포함)'}
                    {parsed.length !== questionCount && (
                      <span className="ml-2 text-yellow-600">(전체 {questionCount}문제)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-red-600">파싱 실패 — 형식을 확인하세요</span>
                )}
              </span>
            </div>

            {isValid && (
              <div className="grid grid-cols-5 gap-1.5 text-xs">
                {parsed.map((p) => (
                  <div
                    key={p.questionNumber}
                    className="flex items-center gap-1 rounded bg-white px-2 py-1 border"
                  >
                    <span className="text-gray-400 w-5">{p.questionNumber}.</span>
                    <span className="font-bold text-primary-600">{CIRCLE_LABELS[p.correctAnswer]}</span>
                    {p.points !== undefined && (
                      <span className="text-gray-400 ml-auto">{p.points}점</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            loading={mutation.isPending}
          >
            {parsed.length}개 정답 저장
          </Button>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-500">{mutation.error.message}</p>
        )}
      </div>
    </Modal>
  );
}
