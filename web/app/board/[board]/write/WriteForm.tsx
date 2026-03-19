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
  const [adminPassword, setAdminPassword] = useState("");
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

      <h1 className="text-xl font-black text-slate-800 mt-2 mb-5">글쓰기</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nickname */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">
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
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">
            제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            maxLength={100}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">
            내용
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            maxLength={5000}
            required
            rows={10}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-y"
          />
          <p className="text-xs text-slate-400 mt-1 text-right">
            {content.length}/5000
          </p>
        </div>

        {/* Password */}
        {isNotice ? (
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">
              관리자 비밀번호
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="관리자 비밀번호를 입력하세요"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">
              글 비밀번호
              <span className="font-normal text-slate-400 ml-1">
                (삭제 시 필요)
              </span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="4자 이상"
              minLength={4}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        )}

        {error && (
          <p className="text-sm font-medium text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-[15px] font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 btn-primary !rounded-xl !py-3 text-[15px] disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
