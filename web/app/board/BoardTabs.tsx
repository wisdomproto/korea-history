"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Post } from "@/lib/supabase";

const TABS = [
  { id: "notice", label: "공지", icon: "📢", color: "text-amber-600", bg: "bg-amber-50" },
  { id: "free", label: "자유", icon: "💬", color: "text-indigo-600", bg: "bg-indigo-50" },
  { id: "suggestion", label: "건의", icon: "💡", color: "text-emerald-600", bg: "bg-emerald-50" },
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
  const [total, setTotal] = useState(0);

  const fetchPosts = (tab: string, p: number) => {
    setLoading(true);
    fetch(`/api/board/${tab}?page=${p}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
    fetchPosts(activeTab, 1);
  }, [activeTab]);

  useEffect(() => {
    if (page === 1) return;
    fetchPosts(activeTab, page);
  }, [page]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/board?tab=${tab}`, { scroll: false });
  };

  const activeTabInfo = TABS.find((t) => t.id === activeTab)!;

  return (
    <div>
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 mb-5 text-white">
        <h1 className="text-xl font-black">게시판</h1>
        <p className="text-sm text-indigo-100 mt-0.5">
          한국사능력검정시험 학습 커뮤니티
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 rounded-2xl bg-slate-100/80 p-1.5 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold transition-all ${
              activeTab === tab.id
                ? "bg-white text-slate-800 shadow-sm card-shadow"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400">
          {!loading && `총 ${total}개`}
        </span>
        <Link
          href={`/board/${activeTab}/write`}
          className="flex items-center gap-1 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-600 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          글쓰기
        </Link>
      </div>

      {/* Post list */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">{activeTabInfo.icon}</p>
          <p className="text-sm text-slate-400">아직 게시글이 없습니다.</p>
          <Link
            href={`/board/${activeTab}/write`}
            className="inline-block mt-3 text-sm font-semibold text-indigo-500 hover:text-indigo-600"
          >
            첫 번째 글을 작성해보세요
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/board/${activeTab}/${post.id}`}
              className="block rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <p className="text-[15px] font-semibold text-slate-800 truncate leading-snug">
                {post.title}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center rounded-md ${activeTabInfo.bg} px-1.5 py-0.5 text-[11px] font-bold ${activeTabInfo.color}`}>
                  {post.nickname}
                </span>
                <span className="text-[11px] text-slate-300">
                  {formatDate(post.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
          >
            이전
          </button>
          <span className="text-sm font-bold text-slate-600">
            {page} <span className="text-slate-300">/</span> {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
