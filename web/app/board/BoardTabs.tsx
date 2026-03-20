"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Post } from "@/lib/supabase";

const TABS = [
  { id: "notice", label: "공지", icon: "📢", color: "text-amber-600", bg: "bg-amber-50" },
  { id: "free", label: "자유", icon: "💬", color: "text-blue-600", bg: "bg-blue-50" },
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
  return `${d.getMonth() + 1}/${d.getDate()}`;
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

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPosts = (tab: string, p: number, search: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (search) params.set("search", search);
    fetch(`/api/board/${tab}?${params}`)
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
    setSearchInput("");
    setSearchQuery("");
    fetchPosts(activeTab, 1, "");
  }, [activeTab]);

  useEffect(() => {
    fetchPosts(activeTab, page, searchQuery);
  }, [page, searchQuery]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/board?tab=${tab}`, { scroll: false });
  };

  const handleSearch = () => {
    setPage(1);
    setSearchQuery(searchInput);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleWriteClick = () => {
    if (activeTab === "notice") {
      setShowAdminModal(true);
      setAdminPw("");
      setAdminError("");
    } else {
      router.push(`/board/${activeTab}/write`);
    }
  };

  const handleAdminSubmit = () => {
    if (!adminPw) { setAdminError("비밀번호를 입력해주세요."); return; }
    sessionStorage.setItem("adminPassword", adminPw);
    setShowAdminModal(false);
    router.push(`/board/notice/write`);
  };

  const activeTabInfo = TABS.find((t) => t.id === activeTab)!;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">게시판</h1>
          <p className="text-sm text-gray-400">한국사능력검정시험 학습 커뮤니티</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 rounded-2xl bg-gray-100 p-1.5 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold transition-all ${
              activeTab === tab.id
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="제목, 내용, 닉네임 검색"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-colors"
          />
          {searchQuery && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-200 transition-colors shrink-0"
        >
          검색
        </button>
      </div>

      {/* Sub header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400">
          {!loading && (searchQuery ? `"${searchQuery}" 검색 결과 ${total}개` : `총 ${total}개`)}
        </span>
        <button
          onClick={handleWriteClick}
          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          글쓰기
        </button>
      </div>

      {/* Post list — table style */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block w-6 h-6 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">{searchQuery ? "🔍" : activeTabInfo.icon}</p>
          <p className="text-sm text-slate-400">
            {searchQuery ? "검색 결과가 없습니다." : "아직 게시글이 없습니다."}
          </p>
          {!searchQuery && (
            <Link
              href={`/board/${activeTab}/write`}
              className="inline-block mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              첫 번째 글을 작성해보세요
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_48px_48px_48px] gap-2 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
            <span>제목</span>
            <span className="text-center">작성자</span>
            <span className="text-center">
              <svg className="w-3.5 h-3.5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </span>
            <span className="text-center">
              <svg className="w-3.5 h-3.5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </span>
            <span className="text-center">날짜</span>
          </div>

          {/* Post rows */}
          <div className="divide-y divide-slate-100">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/board/${activeTab}/${post.id}`}
                className={`block px-4 py-3 hover:bg-slate-50/80 transition-colors ${post.pinned ? "bg-amber-50/30" : ""}`}
              >
                {/* Desktop — table row */}
                <div className="hidden sm:grid grid-cols-[1fr_80px_48px_48px_48px] gap-2 items-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {post.pinned && <span className="text-[11px] shrink-0">📌</span>}
                    <span className="text-[14px] font-semibold text-slate-800 truncate">{post.title}</span>
                    {(post.comment_count ?? 0) > 0 && (
                      <span className="text-[12px] font-bold text-emerald-600 shrink-0">[{post.comment_count}]</span>
                    )}
                  </div>
                  <span className="text-[12px] font-medium text-slate-500 text-center truncate">{post.nickname}</span>
                  <span className="text-[12px] text-slate-400 text-center">{post.view_count ?? 0}</span>
                  <span className="text-[12px] text-slate-400 text-center">{post.like_count ?? 0}</span>
                  <span className="text-[11px] text-slate-400 text-center">{formatDate(post.created_at)}</span>
                </div>

                {/* Mobile — card style */}
                <div className="sm:hidden">
                  <div className="flex items-center gap-1.5">
                    {post.pinned && <span className="text-[11px] shrink-0">📌</span>}
                    <p className="text-[14px] font-semibold text-slate-800 truncate">{post.title}</p>
                    {(post.comment_count ?? 0) > 0 && (
                      <span className="text-[12px] font-bold text-emerald-600 shrink-0">[{post.comment_count}]</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-500">{post.nickname}</span>
                    <span>{formatDate(post.created_at)}</span>
                    <span className="ml-auto flex items-center gap-2.5">
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        {post.view_count ?? 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        {post.like_count ?? 0}
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-6">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-100 disabled:opacity-20 transition-colors"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-100 disabled:opacity-20 transition-colors"
          >
            ‹
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const n = start + i;
            if (n > totalPages) return null;
            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  page === n
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {n}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-100 disabled:opacity-20 transition-colors"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-100 disabled:opacity-20 transition-colors"
          >
            »
          </button>
        </div>
      )}

      {/* Admin password modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowAdminModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-black text-slate-800 mb-1">관리자 인증</h3>
            <p className="text-sm text-slate-400 mb-4">공지사항 작성을 위해 비밀번호를 입력하세요.</p>
            <input
              type="password"
              value={adminPw}
              onChange={(e) => { setAdminPw(e.target.value); setAdminError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdminSubmit()}
              placeholder="관리자 비밀번호"
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
            />
            {adminError && <p className="text-xs text-red-500 mt-2 font-medium">{adminError}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAdminModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAdminSubmit}
                className="flex-1 btn-primary !rounded-xl !py-2.5 text-sm"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
