import {
  getCategoriesWithExams,
  getAllSubjects,
  getAllExamTypes,
  type ExamType,
  type Subject,
} from "@/lib/exam-types";
import OtherExamsTree from "@/components/OtherExamsTree";

interface Props {
  /** 현재 페이지 시험 (있으면 그 시험은 제외) */
  currentExamId?: string;
  /** 헤더 카피 (기본: "다른 시험 풀기") */
  eyebrow?: string;
  /** 헤더 카피 (기본: "공무원 · 자격증 시험") */
  title?: string;
  /** 부제 */
  description?: string;
}

export default function OtherExamsSection({
  currentExamId,
  eyebrow = "다른 시험 풀기",
  title = "공무원 · 자격증 시험",
  description = "기출노트는 한능검 외에도 9급/7급/경찰/소방/군무원 + 공인중개사·정보처리기사·사회복지사 1급 등의 기출문제를 무료로 제공합니다. 시험과 과목을 선택해 시작하세요.",
}: Props) {
  const groups = getCategoriesWithExams();
  const allSubjects = getAllSubjects();

  // 부모 → 자녀 직렬 ExamType 매핑 (직렬 분리된 시험용)
  const childrenByParentId: Record<string, ExamType[]> = {};
  for (const e of getAllExamTypes()) {
    if (e.parentExamId) {
      (childrenByParentId[e.parentExamId] ??= []).push(e);
    }
  }

  const populated = groups
    .map((g) => ({
      ...g,
      examTypes: g.examTypes.filter((e) => e.id !== currentExamId && e.status === "live"),
    }))
    .filter((g) => g.examTypes.length > 0);

  if (populated.length === 0) return null;

  return (
    <section className="gc-fullbleed bg-[var(--gc-paper,#FFFFFF)] border-t border-[var(--gc-hairline)]">
      <div className="mx-auto max-w-4xl px-5 sm:px-6 md:px-8 py-16 md:py-20">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--gc-amber)]">
          {eyebrow}
        </div>
        <h2 className="mt-3 font-serif-kr text-3xl md:text-5xl font-black text-[var(--gc-ink)]">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm md:text-base text-[var(--gc-ink2)]">{description}</p>

        <div className="mt-10">
          <OtherExamsTree groups={populated} subjects={allSubjects} childrenByParentId={childrenByParentId} />
        </div>
      </div>
    </section>
  );
}

// Re-exports for OtherExamsTree to consume types easily
export type { ExamType, Subject };
