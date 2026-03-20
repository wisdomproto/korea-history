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
  free: { bg: "bg-indigo-50", text: "text-indigo-600" },
  suggestion: { bg: "bg-emerald-50", text: "text-emerald-600" },
};

export default function PostDetail({ board, id }: { board: string; id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete post
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

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
    // Check if already liked
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

  const handleDelete = async () => {
    if (!deletePassword) { setDeleteError("비밀번호를 입력해주세요."); return; }
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/board/${board}/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error || "삭제에 실패했습니다."); return; }
      router.push(`/board?tab=${board}`);
    } catch { setDeleteError("네트워크 오류가 발생했습니다."); }
    finally { setDeleting(false); }
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
    if (!commentNickname.trim() || !commentContent.trim()) {
      setCommentError("닉네임과 내용을 입력해주세요.");
      return;
    }
    if (!commentPassword || commentPassword.length < 4) {
      setCommentError("비밀번호는 4자 이상 입력해주세요.");
      return;
    }
    setSubmittingComment(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: commentNickname,
          content: commentContent,
          password: commentPassword,
        }),
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
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2.5">
            <span className={`rounded-lg ${colors.bg} px-2 py-0.5 text-[11px] font-bold ${colors.text}`}>
              {label}
            </span>
            {post.pinned && (
              <span className="rounded-lg bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-500">
                📌 고정
              </span>
            )}
          </div>
          <h1 className="text-lg font-black text-slate-800 leading-snug">{post.title}</h1>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
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

        <div className="flex items-center gap-2">
          {board === "suggestion" && (
            <button
              onClick={() => { setShowPinModal(true); setPinAdminPw(""); setPinError(""); }}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            >
              {post.pinned ? "고정 해제" : "📌 고정"}
            </button>
          )}
          <button
            onClick={() => setShowDelete(!showDelete)}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50/50 p-4 animate-fade-in">
          <p className="text-sm font-bold text-red-600 mb-2.5">비밀번호를 입력하세요</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
              placeholder="비밀번호"
              className="flex-1 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <button onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
              {deleting ? "..." : "삭제"}
            </button>
          </div>
          {deleteError && <p className="text-xs font-medium text-red-500 mt-2">{deleteError}</p>}
        </div>
      )}

      {/* Pin modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowPinModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-black text-slate-800 mb-1">
              {post.pinned ? "고정 해제" : "상단 고정"}
            </h3>
            <p className="text-sm text-slate-400 mb-4">관리자 비밀번호를 입력하세요.</p>
            <input
              type="password"
              value={pinAdminPw}
              onChange={(e) => { setPinAdminPw(e.target.value); setPinError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handlePin()}
              placeholder="관리자 비밀번호"
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[15px] focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
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
          댓글 {comments.length > 0 && <span className="text-indigo-500">{comments.length}</span>}
        </h2>

        {/* Comment list */}
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
                    className="ml-auto text-[11px] text-slate-300 hover:text-red-400 transition-colors"
                  >
                    삭제
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
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600"
                    >
                      삭제
                    </button>
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
            <input
              type="text"
              value={commentNickname}
              onChange={(e) => setCommentNickname(e.target.value)}
              placeholder="닉네임"
              maxLength={20}
              className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            />
            <input
              type="password"
              value={commentPassword}
              onChange={(e) => setCommentPassword(e.target.value)}
              placeholder="비밀번호 (4자 이상)"
              className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !submittingComment && handleCommentSubmit()}
              placeholder="댓글을 입력하세요"
              maxLength={1000}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            />
            <button
              onClick={handleCommentSubmit}
              disabled={submittingComment}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors shrink-0"
            >
              {submittingComment ? "..." : "등록"}
            </button>
          </div>
          {commentError && <p className="text-xs text-red-500 mt-2 font-medium">{commentError}</p>}
        </div>
      </div>
    </div>
  );
}
