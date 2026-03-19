import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "게시판 - 기출노트 한능검",
  description: "한국사능력검정시험 학습 커뮤니티 게시판",
};

const BOARDS = [
  {
    id: "notice",
    label: "공지사항",
    description: "공지사항 및 업데이트 안내",
    icon: "📢",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    id: "free",
    label: "자유 게시판",
    description: "자유롭게 이야기를 나눠보세요",
    icon: "💬",
    color: "from-indigo-500 to-purple-500",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  {
    id: "suggestion",
    label: "건의 게시판",
    description: "서비스 개선을 위한 건의사항을 남겨주세요",
    icon: "💡",
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
];

export default function BoardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">게시판</h1>
        <p className="text-sm text-slate-400 mt-1">
          한국사능력검정시험 학습 커뮤니티
        </p>
      </div>

      <div className="space-y-3">
        {BOARDS.map((board) => (
          <Link
            key={board.id}
            href={`/board/${board.id}`}
            className={`block rounded-2xl border ${board.border} ${board.bg} p-5 transition-all hover:scale-[1.01] hover:shadow-md`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{board.icon}</span>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {board.label}
                </h2>
                <p className="text-sm text-slate-500">{board.description}</p>
              </div>
              <svg
                className="ml-auto h-5 w-5 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
