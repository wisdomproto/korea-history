"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BreadCrumb from "@/components/BreadCrumb";

interface Props {
  board: string;
  label: string;
}

export default function WriteForm({ board, label }: Props) {
  const router = useRouter();
  const isNotice = board === "notice";

  const [nickname, setNickname] = useState(isNotice ? "관리자" : "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState(() => {
    if (typeof window !== "undefined" && isNotice) {
      const stored = sessionStorage.getItem("adminPassword") || "";
      sessionStorage.removeItem("adminPassword");
      return stored;
    }
    return "";
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/board/${board}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          title: title.trim(),
          content: content.trim(),
          password: isNotice ? adminPassword : password,
          adminPassword: isNotice ? adminPassword : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "오류가 발생했습니다.");
        return;
      }

      router.push(`/board/${board}/${data.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "게시판", href: `/board?tab=${board}` },
          { label: "글쓰기" },
        ]}
      />

      <div className="mt-3 mb-5">
        <h1 className="text-xl font-black text-slate-800">글쓰기</h1>
        <p className="text-sm text-slate-400 mt-0.5">{label}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4 card-shadow">
          {/* Nickname */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={20}
              required
              disabled={isNotice}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={100}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              maxLength={5000}
              required
              rows={10}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-y transition-colors"
            />
            <p className="text-[11px] text-slate-300 mt-1 text-right font-medium">
              {content.length} / 5,000
            </p>
          </div>
        </div>

        {/* Password section */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 card-shadow">
          {isNotice ? (
            <div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-emerald-600">관리자 인증 완료</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                글 비밀번호
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                나중에 글을 삭제할 때 필요합니다
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="4자 이상 입력"
                minLength={4}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-slate-200 py-3.5 text-[15px] font-bold text-slate-400 hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 btn-primary !rounded-xl !py-3.5 text-[15px] disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
