import { useState, useRef } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import type { Exam } from '@/lib/types';

interface ExamFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (exam: Omit<Exam, 'id'>, pdfFile?: File) => void;
  initial?: Exam;
  loading?: boolean;
  existingExamNumbers?: number[];
}

export function ExamForm({ open, onClose, onSubmit, initial, loading, existingExamNumbers = [] }: ExamFormProps) {
  const nextNumber = existingExamNumbers.length > 0 ? Math.max(...existingExamNumbers) + 1 : 76;
  const [examNumber, setExamNumber] = useState(initial?.examNumber ?? nextNumber);
  const [examDate, setExamDate] = useState(initial?.examDate ?? new Date().toISOString().split('T')[0]);
  const [examType, setExamType] = useState<'advanced' | 'basic'>(initial?.examType ?? 'advanced');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(initial?.timeLimitMinutes ?? 70);
  const [isFree, setIsFree] = useState(initial?.isFree ?? true);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isDuplicate = !initial && existingExamNumbers.includes(examNumber);

  const handleSubmit = () => {
    if (isDuplicate) return;
    onSubmit(
      {
        examNumber,
        examDate,
        examType,
        totalQuestions: initial?.totalQuestions ?? 0,
        timeLimitMinutes,
        isFree,
      },
      pdfFile ?? undefined,
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') setPdfFile(file);
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? '시험 수정' : '새 시험 만들기'}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">회차 번호</label>
          <input
            type="number"
            value={examNumber}
            onChange={(e) => setExamNumber(parseInt(e.target.value, 10))}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
              isDuplicate ? 'border-red-400 bg-red-50' : 'focus:border-primary-500'
            }`}
          />
          {isDuplicate && (
            <p className="mt-1 text-xs text-red-500">제{examNumber}회가 이미 존재합니다. 다른 번호를 입력하세요.</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">시행일</label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">유형</label>
          <div className="flex gap-2">
            {(['advanced', 'basic'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setExamType(type)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  examType === type ? 'border-primary-500 bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                }`}
              >
                {type === 'advanced' ? '심화' : '기본'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">제한 시간 (분)</label>
          <input
            type="number"
            value={timeLimitMinutes}
            onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value, 10))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isFree" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          <label htmlFor="isFree" className="text-sm">무료 공개</label>
        </div>

        {/* PDF Import */}
        {!initial && (
          <div>
            <label className="mb-1 block text-sm font-medium">PDF에서 문제 가져오기 <span className="font-normal text-gray-400">(선택)</span></label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                pdfFile ? 'border-primary-300 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
              }`}
            >
              {pdfFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-lg">📄</span>
                    <span className="font-medium text-primary-700">{pdfFile.name}</span>
                    <span className="text-xs text-gray-400">({(pdfFile.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button
                    onClick={() => { setPdfFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="rounded-full text-gray-400 hover:text-red-500 text-lg leading-none"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-1 text-gray-400">
                  <span className="text-2xl">📄</span>
                  <span className="text-xs">PDF 파일을 드래그하거나 클릭하여 선택</span>
                  <span className="text-[10px] text-gray-300">AI가 문제를 자동 추출합니다 (Gemini)</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={isDuplicate}>
            {initial ? '수정' : pdfFile ? '생성 + PDF 가져오기' : '생성'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
