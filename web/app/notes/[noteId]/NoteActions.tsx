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
        className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 p-5 text-white shadow-md hover:shadow-lg transition-shadow"
      >
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl">📝</span>
          <div className="text-left">
            <p className="text-[15px] font-black">관련 기출문제 풀기</p>
            <p className="text-xs text-indigo-200 mt-0.5">
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
