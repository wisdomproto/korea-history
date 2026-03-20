"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BreadCrumb from "@/components/BreadCrumb";
import { BOARD_LABELS, type Post, type Board } from "@/lib/supabase";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const BOARD_COLORS: Record<string, { bg: string; text: string }> = {
  notice: { bg: "bg-amber-50", text: "text-amber-600" },
  free: { bg: "bg-indigo-50", text: "text-indigo-600" },
  suggestion: { bg: "bg-emerald-50", text: "text-emerald-600" },
};

export default function PostDetail({ board, id }: { board: string; id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const label = BOARD_LABELS[board as Board] || board;
  const colors = BOARD_COLORS[board] || BOARD_COLORS.free;

  useEffect(() => {
    fetch(`/api/board/${board}/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPost(data))
      .finally(() => setLoading(false));
  }, [board, id]);

  const handleDelete = async () => {
    if (!deletePassword) {
      setDeleteError("비밀번호를 입력해주세요.");
      return;
    }
    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/board/${board}/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "삭제에 실패했습니다.");
        return;
      }

      router.push(`/board?tab=${board}`);
    } catch {
      setDeleteError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-3">😢</p>
        <p className="text-slate-400 mb-4">게시글을 찾을 수 없습니다.</p>
        <Link href={`/board?tab=${board}`} className="text-indigo-500 font-semibold text-sm">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "게시판", href: `/board?tab=${board}` },
          { label: post.title },
        ]}
      />

      {/* Post card */}
      <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white overflow-hidden card-shadow">
        {/* Post header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2.5">
            <span className={`rounded-lg ${colors.bg} px-2 py-0.5 text-[11px] font-bold ${colors.text}`}>
              {label}
            </span>
          </div>
          <h1 className="text-lg font-black text-slate-800 leading-snug">
            {post.title}
          </h1>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {post.nickname.charAt(0)}
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {post.nickname}
            </span>
            <span className="text-xs text-slate-300">
              {formatDate(post.created_at)}
            </span>
          </div>
        </div>

        {/* Post content */}
        <div className="px-5 py-5">
          <p className="text-[15px] text-slate-700 leading-[28px] whitespace-pre-wrap">
            {post.content}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        <Link
          href={`/board?tab=${board}`}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          목록
        </Link>

        <button
          onClick={() => setShowDelete(!showDelete)}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          삭제
        </button>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50/50 p-4 animate-fade-in">
          <p className="text-sm font-bold text-red-600 mb-2.5">
            글 비밀번호를 입력하세요
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호"
              className="flex-1 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deleting ? "..." : "삭제"}
            </button>
          </div>
          {deleteError && (
            <p className="text-xs font-medium text-red-500 mt-2">{deleteError}</p>
          )}
        </div>
      )}
    </div>
  );
}
