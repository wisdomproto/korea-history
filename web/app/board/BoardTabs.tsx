"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Post } from "@/lib/supabase";

const TABS = [
  { id: "notice", label: "공지사항", icon: "📢" },
  { id: "free", label: "자유", icon: "💬" },
  { id: "suggestion", label: "건의", icon: "💡" },
] as const;

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

export default function BoardTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "notice";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetch(`/api/board/${activeTab}?page=1`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (page === 1) return;
    setLoading(true);
    fetch(`/api/board/${activeTab}?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [page]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/board?tab=${tab}`, { scroll: false });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-slate-800">게시판</h1>
        <Link
          href={`/board/${activeTab}/write`}
          className="btn-primary !rounded-xl !py-2 !px-4 text-sm"
        >
          글쓰기
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Post list */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          아직 게시글이 없습니다.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {posts.map((post, i) => (
            <Link
              key={post.id}
              href={`/board/${activeTab}/${post.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-bold text-slate-300 w-6 text-center shrink-0">
                {(page - 1) * 20 + i + 1}
              </span>
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
