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

export default function PostDetail({ board, id }: { board: string; id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const label = BOARD_LABELS[board as Board] || board;

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

      router.push(`/board/${board}`);
    } catch {
      setDeleteError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400">불러오는 중...</div>;
  }

  if (!post) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-400 mb-4">게시글을 찾을 수 없습니다.</p>
        <Link href={`/board/${board}`} className="text-indigo-500 font-semibold text-sm">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "게시판", href: "/board" },
          { label, href: `/board/${board}` },
          { label: post.title },
        ]}
      />

      {/* Post header */}
      <div className="mt-3 mb-4">
        <h1 className="text-xl font-black text-slate-800 leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-semibold text-indigo-600">
            {post.nickname}
          </span>
          <span className="text-xs text-slate-300">|</span>
          <span className="text-xs text-slate-400">
            {formatDate(post.created_at)}
          </span>
        </div>
      </div>

      {/* Post content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-4">
        <p className="text-[15px] text-slate-700 leading-[26px] whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/board/${board}`}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          목록
        </Link>

        {board !== "notice" && (
          <button
            onClick={() => setShowDelete(!showDelete)}
            className="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors"
          >
            삭제
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 animate-fade-in">
          <p className="text-sm font-semibold text-red-600 mb-2">
            글 비밀번호를 입력하세요
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호"
              className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deleting ? "..." : "삭제"}
            </button>
          </div>
          {deleteError && (
            <p className="text-xs text-red-500 mt-2">{deleteError}</p>
          )}
        </div>
      )}
    </div>
  );
}
