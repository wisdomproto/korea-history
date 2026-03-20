"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BreadCrumb from "@/components/BreadCrumb";
import { BOARD_LABELS, type Post, type Board, type Comment } from "@/lib/supabase";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatDate(dateStr);
}

const BOARD_COLORS: Record<string, { bg: string; text: string }> = {
  notice: { bg: "bg-amber-50", text: "text-amber-600" },
  free: { bg: "bg-emerald-50", text: "text-emerald-700" },
  suggestion: { bg: "bg-emerald-50", text: "text-emerald-600" },
};

// SVG icon components
const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);
const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const IconPin = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

export default function PostDetail({ board, id }: { board: string; id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // Action mode: null | "edit" | "delete"
  const [actionMode, setActionMode] = useState<"edit" | "delete" | null>(null);
  const [actionPassword, setActionPassword] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Edit fields
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Like
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Comment form
  const [commentNickname, setCommentNickname] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [commentPassword, setCommentPassword] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Delete comment
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [deleteCommentPw, setDeleteCommentPw] = useState("");
  const [deleteCommentError, setDeleteCommentError] = useState("");

  // Pin
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAdminPw, setPinAdminPw] = useState("");
  const [pinError, setPinError] = useState("");

  const label = BOARD_LABELS[board as Board] || board;
  const colors = BOARD_COLORS[board] || BOARD_COLORS.free;

  useEffect(() => {
    const likedPosts = JSON.parse(localStorage.getItem("liked-posts") || "[]");
    if (likedPosts.includes(id)) setLiked(true);

    fetch(`/api/board/${board}/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setPost(data);
        setLikeCount(data?.like_count || 0);
      })
      .finally(() => setLoading(false));

    fetch(`/api/comments/${id}`)
      .then((r) => r.json())
      .then((data) => setComments(data || []))
      .catch(() => {});
  }, [board, id]);

  const openAction = (mode: "edit" | "delete") => {
    setActionMode(mode);
    setActionPassword("");
    setActionError("");
    if (mode === "edit" && post) {
      setEditTitle(post.title);
      setEditContent(post.content);
    }
  };

  const closeAction = () => {
    setActionMode(null);
    setActionPassword("");
    setActionError("");
  };

  const handleEdit = async () => {
    if (!actionPassword) { setActionError("비밀번호를 입력해주세요."); return; }
    if (!editTitle.trim() || !editContent.trim()) { setActionError("제목과 내용을 입력해주세요."); return; }
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/board/${board}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", password: actionPassword, title: editTitle, content: editContent }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error); return; }
      setPost((p) => p ? { ...p, title: editTitle.trim(), content: editContent.trim() } : p);
      closeAction();
    } catch { setActionError("네트워크 오류가 발생했습니다."); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!actionPassword) { setActionError("비밀번호를 입력해주세요."); return; }
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/board/${board}/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: actionPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error || "삭제에 실패했습니다."); return; }
      router.push(`/board?tab=${board}`);
    } catch { setActionError("네트워크 오류가 발생했습니다."); }
    finally { setActionLoading(false); }
  };

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    setLikeCount((c) => c + 1);
    const likedPosts = JSON.parse(localStorage.getItem("liked-posts") || "[]");
    localStorage.setItem("liked-posts", JSON.stringify([...likedPosts, id]));
    await fetch(`/api/board/${board}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like" }),
    });
  };

  const handleCommentSubmit = async () => {
    if (!commentNickname.trim() || !commentContent.trim()) { setCommentError("닉네임과 내용을 입력해주세요."); return; }
    if (!commentPassword || commentPassword.length < 4) { setCommentError("비밀번호는 4자 이상 입력해주세요."); return; }
    setSubmittingComment(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: commentNickname, content: commentContent, password: commentPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setCommentError(data.error); return; }
      setComments((prev) => [...prev, data]);
      setCommentContent("");
    } catch { setCommentError("네트워크 오류가 발생했습니다."); }
    finally { setSubmittingComment(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!deleteCommentPw) { setDeleteCommentError("비밀번호를 입력해주세요."); return; }
    try {
      const res = await fetch(`/api/comments/${id}/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deleteCommentPw }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteCommentError(data.error); return; }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setDeletingCommentId(null);
      setDeleteCommentPw("");
      setDeleteCommentError("");
    } catch { setDeleteCommentError("네트워크 오류가 발생했습니다."); }
  };

  const handlePin = async () => {
    if (!pinAdminPw) { setPinError("비밀번호를 입력해주세요."); return; }
    const action = post?.pinned ? "unpin" : "pin";
    try {
      const res = await fetch(`/api/board/${board}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminPassword: pinAdminPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPinError(data.error); return; }
      setPost((p) => p ? { ...p, pinned: data.pinned } : p);
      setShowPinModal(false);
      setPinAdminPw("");
    } catch { setPinError("네트워크 오류가 발생했습니다."); }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-3">😢</p>
        <p className="text-slate-400 mb-4">게시글을 찾을 수 없습니다.</p>
        <Link href={`/board?tab=${board}`} className="text-emerald-600 font-semibold text-sm">목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div>
      <BreadCrumb items={[{ label: "게시판", href: `/board?tab=${board}` }, { label: post.title }]} />

      {/* Post card */}
      <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white overflow-hidden card-shadow">
        {/* Header with action icons */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className={`rounded-lg ${colors.bg} px-2 py-0.5 text-[11px] font-bold ${colors.text}`}>{label}</span>
              {post.pinned && (
                <span className="rounded-lg bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-500">📌 고정</span>
              )}
            </div>
            {/* Action icons */}
            <div className="flex items-center gap-0.5">
              {board === "suggestion" && (
                <button
                  onClick={() => { setShowPinModal(true); setPinAdminPw(""); setPinError(""); }}
                  className="p-2 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                  title={post.pinned ? "고정 해제" : "상단 고정"}
                >
                  <IconPin />
                </button>
              )}
              <button
                onClick={() => actionMode === "edit" ? closeAction() : openAction("edit")}
                className={`p-2 rounded-lg transition-colors ${actionMode === "edit" ? "text-emerald-600 bg-emerald-50" : "text-slate-300 hover:text-emerald-600 hover:bg-emerald-50"}`}
                title="수정"
              >
                <IconEdit />
              </button>
              <button
                onClick={() => actionMode === "delete" ? closeAction() : openAction("delete")}
                className={`p-2 rounded-lg transition-colors ${actionMode === "delete" ? "text-red-500 bg-red-50" : "text-slate-300 hover:text-red-500 hover:bg-red-50"}`}
                title="삭제"
              >
                <IconTrash />
              </button>
            </div>
          </div>

          {/* Edit / Delete password panel */}
          {actionMode && (
            <div className={`rounded-xl p-3 mb-3 animate-fade-in ${actionMode === "delete" ? "bg-red-50/70 border border-red-200" : "bg-emerald-50/70 border border-emerald-200"}`}>
              {actionMode === "edit" && (
                <div className="space-y-2 mb-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="제목"
                    maxLength={100}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="내용"
                    maxLength={5000}
                    rows={5}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="password"
                  value={actionPassword}
                  onChange={(e) => { setActionPassword(e.target.value); setActionError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && (actionMode === "edit" ? handleEdit() : handleDelete())}
                  placeholder="비밀번호"
                  className={`flex-1 rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    actionMode === "delete" ? "border-red-200 focus:ring-red-100" : "border-emerald-200 focus:ring-emerald-100"
                  }`}
                />
                <button
                  onClick={() => setActionMode(null)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={actionMode === "edit" ? handleEdit : handleDelete}
                  disabled={actionLoading}
                  className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 transition-colors ${
                    actionMode === "delete" ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {actionLoading ? "..." : actionMode === "edit" ? "수정" : "삭제"}
                </button>
              </div>
              {actionError && <p className="text-xs font-medium text-red-500 mt-2">{actionError}</p>}
            </div>
          )}

          <h1 className="text-lg font-black text-slate-800 leading-snug">{post.title}</h1>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-purple-400 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{post.nickname.charAt(0)}</span>
            </div>
            <span className="text-sm font-semibold text-slate-700">{post.nickname}</span>
            <span className="text-xs text-slate-300">{formatDate(post.created_at)}</span>
            <span className="text-xs text-slate-300 ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                {post.view_count}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {likeCount}
              </span>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          <p className="text-[15px] text-slate-700 leading-[28px] whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Like button */}
        <div className="px-5 pb-5 flex items-center gap-2">
          <button
            onClick={handleLike}
            disabled={liked}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              liked
                ? "bg-red-50 text-red-500 border border-red-200"
                : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
            }`}
          >
            <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            좋아요 {likeCount > 0 && likeCount}
          </button>
        </div>
      </div>

      {/* Back to list */}
      <div className="mt-4">
        <Link
          href={`/board?tab=${board}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          목록
        </Link>
      </div>

      {/* Pin modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowPinModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-black text-slate-800 mb-1">{post.pinned ? "고정 해제" : "상단 고정"}</h3>
            <p className="text-sm text-slate-400 mb-4">관리자 비밀번호를 입력하세요.</p>
            <input
              type="password"
              value={pinAdminPw}
              onChange={(e) => { setPinAdminPw(e.target.value); setPinError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handlePin()}
              placeholder="관리자 비밀번호"
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[15px] focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
            />
            {pinError && <p className="text-xs text-red-500 mt-2 font-medium">{pinError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowPinModal(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors">취소</button>
              <button onClick={handlePin} className="flex-1 btn-primary !rounded-xl !py-2.5 text-sm">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* Comments section */}
      <div className="mt-6">
        <h2 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          댓글 {comments.length > 0 && <span className="text-emerald-600">{comments.length}</span>}
        </h2>

        {comments.length > 0 && (
          <div className="space-y-2 mb-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{comment.nickname.charAt(0)}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700">{comment.nickname}</span>
                  <span className="text-[11px] text-slate-300">{timeAgo(comment.created_at)}</span>
                  <button
                    onClick={() => {
                      setDeletingCommentId(deletingCommentId === comment.id ? null : comment.id);
                      setDeleteCommentPw("");
                      setDeleteCommentError("");
                    }}
                    className="ml-auto p-1 rounded text-slate-300 hover:text-red-400 transition-colors"
                    title="댓글 삭제"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
                <p className="text-[14px] text-slate-600 mt-1.5 leading-relaxed">{comment.content}</p>

                {deletingCommentId === comment.id && (
                  <div className="flex gap-2 mt-2 animate-fade-in">
                    <input
                      type="password"
                      value={deleteCommentPw}
                      onChange={(e) => setDeleteCommentPw(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleDeleteComment(comment.id)}
                      placeholder="비밀번호"
                      className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-100"
                    />
                    <button onClick={() => handleDeleteComment(comment.id)} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600">삭제</button>
                  </div>
                )}
                {deletingCommentId === comment.id && deleteCommentError && (
                  <p className="text-[11px] text-red-500 mt-1">{deleteCommentError}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Comment form */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <div className="flex gap-2 mb-2">
            <input type="text" value={commentNickname} onChange={(e) => setCommentNickname(e.target.value)} placeholder="닉네임" maxLength={20} className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300" />
            <input type="password" value={commentPassword} onChange={(e) => setCommentPassword(e.target.value)} placeholder="비밀번호 (4자 이상)" className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300" />
          </div>
          <div className="flex gap-2">
            <input type="text" value={commentContent} onChange={(e) => setCommentContent(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !submittingComment && handleCommentSubmit()} placeholder="댓글을 입력하세요" maxLength={1000} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300" />
            <button onClick={handleCommentSubmit} disabled={submittingComment} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0">
              {submittingComment ? "..." : "등록"}
            </button>
          </div>
          {commentError && <p className="text-xs text-red-500 mt-2 font-medium">{commentError}</p>}
        </div>
      </div>
    </div>
  );
}
