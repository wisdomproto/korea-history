"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BreadCrumb from "@/components/BreadCrumb";
import type { Post } from "@/lib/supabase";

interface Props {
  board: string;
  label: string;
  description: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function BoardList({ board, label, description }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/board/${board}?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [board, page]);

  const isNotice = board === "notice";

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "게시판", href: "/board" },
          { label },
        ]}
      />

      <div className="flex items-center justify-between mb-4 mt-2">
        <div>
          <h1 className="text-xl font-black text-slate-800">{label}</h1>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        <Link
          href={`/board/${board}/write`}
          className="btn-primary !rounded-xl !py-2 !px-4 text-sm"
        >
          글쓰기
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          아직 게시글이 없습니다.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/board/${board}/${post.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-slate-800 truncate">
                  {post.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-slate-500">
                    {post.nickname}
                  </span>
                  <span className="text-xs text-slate-300">
                    {formatDate(post.created_at)}
                  </span>
                </div>
              </div>
              <svg
                className="h-4 w-4 text-slate-300 shrink-0"
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
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-sm text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
