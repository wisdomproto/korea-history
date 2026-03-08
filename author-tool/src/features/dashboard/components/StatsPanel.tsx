import { useExams } from '@/features/exam/hooks/useExams';
import { ERAS, CATEGORIES } from '@/lib/types';
import type { ExamFile } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { examApi } from '@/features/exam/api/exam.api';

function useAllQuestions() {
  const { data: exams } = useExams();
  return useQuery({
    queryKey: ['all-questions'],
    queryFn: async () => {
      if (!exams) return [];
      const files = await Promise.all(exams.map((e) => examApi.getById(e.id)));
      return files.flatMap((f: ExamFile) => f.questions);
    },
    enabled: !!exams?.length,
  });
}

export function StatsPanel() {
  const { data: exams } = useExams();
  const { data: questions } = useAllQuestions();

  if (!exams || !questions) return null;

  const byEra = ERAS.map((era) => ({ era, count: questions.filter((q) => q.era === era).length }));
  const byCategory = CATEGORIES.map((cat) => ({ category: cat, count: questions.filter((q) => q.category === cat).length }));
  const byDifficulty = [1, 2, 3].map((d) => ({ difficulty: d, count: questions.filter((q) => q.difficulty === d).length }));
  const maxEra = Math.max(...byEra.map((e) => e.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="총 시험" value={exams.length} color="bg-blue-50 text-blue-700" />
        <SummaryCard label="총 문제" value={questions.length} color="bg-green-50 text-green-700" />
        <SummaryCard label="무료 시험" value={exams.filter((e) => e.isFree).length} color="bg-amber-50 text-amber-700" />
        <SummaryCard label="평균 문제수" value={Math.round(questions.length / exams.length)} color="bg-purple-50 text-purple-700" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Era Distribution */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-4 font-semibold">시대별 분포</h3>
          <div className="space-y-2">
            {byEra.map(({ era, count }) => (
              <div key={era} className="flex items-center gap-3">
                <span className="w-20 text-xs text-gray-600 truncate">{era}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${(count / maxEra) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category & Difficulty */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-3 font-semibold">분야별</h3>
            <div className="grid grid-cols-2 gap-2">
              {byCategory.map(({ category, count }) => (
                <div key={category} className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{count}</div>
                  <div className="text-xs text-gray-500">{category}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-3 font-semibold">난이도별</h3>
            <div className="grid grid-cols-3 gap-2">
              {byDifficulty.map(({ difficulty, count }) => (
                <div key={difficulty} className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{count}</div>
                  <div className="text-xs text-gray-500">{['기초', '중급', '심화'][difficulty - 1]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}
