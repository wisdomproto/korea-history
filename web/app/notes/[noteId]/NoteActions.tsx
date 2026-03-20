"use client";

import { useRouter } from "next/navigation";

interface Props {
  questionIds: number[];
  noteTitle: string;
}

export default function NoteActions({ questionIds, noteTitle }: Props) {
  const router = useRouter();

  if (questionIds.length === 0) return null;

  const handleStudy = () => {
    const shuffled = [...questionIds].sort(() => Math.random() - 0.5).slice(0, 100);
    sessionStorage.setItem("studySession", JSON.stringify({
      ids: shuffled,
      title: `📝 ${noteTitle}`,
      totalAvailable: questionIds.length,
    }));
    router.push("/study/session");
  };

  return (
    <div className="my-5">
      <button
        onClick={handleStudy}
        className="w-full rounded-2xl bg-emerald-600 p-5 text-white hover:bg-emerald-700 transition-colors"
      >
        <div className="flex items-center justify-center gap-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
          <div className="text-left">
            <p className="text-[15px] font-bold">관련 기출문제 풀기</p>
            <p className="text-xs text-emerald-200 mt-0.5">
              {questionIds.length}문제{questionIds.length > 100 ? " 중 랜덤 100문제" : ""} 바로 풀기
            </p>
          </div>
          <svg className="w-5 h-5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}
