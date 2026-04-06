import { useEditorStore } from '@/store/editor.store';
import { useCbtExam } from '../hooks/useCbtExam';
import { CbtQuestionCard } from './CbtQuestionCard';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/axios';

export function CbtExamPanel() {
  const { selectedCbtExamId, selectedProjectId } = useEditorStore();
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiGet<any[]>('/projects') });
  const currentProject = projects?.find((p: any) => p.id === selectedProjectId);
  const categoryCode = currentProject?.categoryCode;

  const { data: exam, isLoading, error } = useCbtExam(categoryCode, selectedCbtExamId ?? undefined);

  if (!selectedCbtExamId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📋</div>
          <p>왼쪽에서 시험을 선택하세요</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
          <p className="text-gray-500">문제 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        시험 데이터를 로드할 수 없습니다.
      </div>
    );
  }

  const avgRate = exam.questions.filter((q) => q.answer_rate != null);
  const avg = avgRate.length > 0 ? (avgRate.reduce((sum, q) => sum + q.answer_rate!, 0) / avgRate.length).toFixed(1) : null;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold">{exam.label}</h2>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>📅 {exam.date}</span>
            <span>📝 {exam.question_count}문제</span>
            {avg && <span>📊 평균 정답률 {avg}%</span>}
          </div>
        </div>
        <div className="space-y-4">
          {exam.questions.map((q, i) => (
            <CbtQuestionCard key={q.question_id} question={q} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
