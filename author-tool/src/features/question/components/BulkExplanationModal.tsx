import { useState, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { useBulkUpdateExplanations } from '../hooks/useQuestions';

interface BulkExplanationModalProps {
  open: boolean;
  onClose: () => void;
  examId: number;
  questionCount: number;
}

interface ParsedExplanation {
  questionNumber: number;
  explanation: string;
}

/**
 * Parse numbered explanation text.
 * Supports: "1. 해설...\n2. 해설..." or "1) 해설..." or "1번 해설..." etc.
 * Multi-line explanations: text continues until next numbered entry.
 */
function parseExplanations(input: string): ParsedExplanation[] {
  const text = input.trim();
  if (!text) return [];

  const result: ParsedExplanation[] = [];
  const lines = text.split('\n');
  let currentNum: number | null = null;
  let currentText: string[] = [];

  for (const line of lines) {
    // Match: "1. ...", "1) ...", "1번 ...", "1: ...", "#1 ..."
    const match = line.match(/^(?:#?\s*)?(\d+)\s*[.)번:\-]\s*(.*)/);
    if (match) {
      // Save previous entry
      if (currentNum !== null && currentText.length > 0) {
        result.push({ questionNumber: currentNum, explanation: currentText.join('\n').trim() });
      }
      currentNum = parseInt(match[1]);
      currentText = match[2].trim() ? [match[2].trim()] : [];
    } else if (currentNum !== null && line.trim()) {
      currentText.push(line.trim());
    }
  }
  // Save last entry
  if (currentNum !== null && currentText.length > 0) {
    result.push({ questionNumber: currentNum, explanation: currentText.join('\n').trim() });
  }

  return result.sort((a, b) => a.questionNumber - b.questionNumber);
}

export function BulkExplanationModal({ open, onClose, examId, questionCount }: BulkExplanationModalProps) {
  const [text, setText] = useState('');
  const mutation = useBulkUpdateExplanations();

  const parsed = useMemo(() => parseExplanations(text), [text]);
  const isValid = parsed.length > 0;

  const handleSubmit = () => {
    mutation.mutate(
      { examId, explanations: parsed },
      {
        onSuccess: () => {
          setText('');
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="해설 일괄입력" maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
            placeholder={`해설을 번호별로 붙여넣으세요.\n\n예시:\n1. 고인돌은 청동기 시대의 대표적인 무덤 양식이다.\n2. 빗살무늬 토기는 신석기 시대의 대표적인 토기이다.\n3. 반량전은 중국 진나라의 화폐로,\n   고조선과의 교역을 증명하는 유물이다.\n...`}
          />
        </div>

        {/* Parse result */}
        {text.trim() && (
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="mb-2">
              <span className="text-sm font-medium">
                {isValid ? (
                  <span className="text-green-700">
                    {parsed.length}개 해설 파싱됨
                    {parsed.length !== questionCount && (
                      <span className="ml-2 text-yellow-600">(전체 {questionCount}문제)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-red-600">파싱 실패 — "1. 해설..." 형식으로 입력하세요</span>
                )}
              </span>
            </div>

            {isValid && (
              <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                {parsed.map((p) => (
                  <div key={p.questionNumber} className="flex gap-2 rounded bg-white px-2 py-1.5 border">
                    <span className="shrink-0 font-bold text-primary-600 w-6">{p.questionNumber}.</span>
                    <span className="text-gray-700 truncate">{p.explanation}</span>
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
            {parsed.length}개 해설 저장
          </Button>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-500">{mutation.error.message}</p>
        )}
      </div>
    </Modal>
  );
}
