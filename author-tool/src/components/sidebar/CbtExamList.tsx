import { useCbtExams } from '@/features/cbt-import/hooks/useCbtExams';

interface CbtExamListProps {
  categoryCode: string | undefined;
  selectedCbtExamId: string | null;
  setSelectedCbtExamId: (id: string) => void;
}

export function CbtExamList({ categoryCode, selectedCbtExamId, setSelectedCbtExamId }: CbtExamListProps) {
  const { data: cbtExams, isLoading: cbtExamsLoading } = useCbtExams(categoryCode);

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
      {cbtExamsLoading ? (
        <div className="p-4 text-center text-sm text-gray-400">로딩 중...</div>
      ) : !cbtExams?.length ? (
        <div className="p-4 text-center text-sm text-gray-400">시험이 없습니다</div>
      ) : (
        cbtExams.map((exam) => (
          <div
            key={exam.exam_id}
            onClick={() => setSelectedCbtExamId(exam.exam_id)}
            className={`cursor-pointer border-b px-4 py-3 text-left transition-all hover:bg-gray-50 ${
              selectedCbtExamId === exam.exam_id ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent'
            }`}
          >
            <div className="text-xs font-medium truncate">{exam.label}</div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{exam.date}</span>
              <span>{exam.question_count}문제</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
