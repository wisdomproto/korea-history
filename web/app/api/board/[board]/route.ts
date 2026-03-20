import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const VALID_BOARDS = new Set<string>(["free", "suggestion", "notice"]);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "8054";

interface RouteContext {
  params: Promise<{ board: string }>;
}

// GET /api/board/[board] — list posts (pinned first, then by date)
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { board } = await ctx.params;
  if (!VALID_BOARDS.has(board)) {
    return NextResponse.json({ error: "Invalid board" }, { status: 400 });
  }

  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("posts")
    .select("id, board, nickname, title, view_count, like_count, pinned, created_at", { count: "exact" })
    .eq("board", board)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get comment counts for these posts
  const postIds = (data || []).map((p) => p.id);
  let commentCounts: Record<string, number> = {};
  if (postIds.length > 0) {
    const { data: comments } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);
    if (comments) {
      for (const c of comments) {
        commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
      }
    }
  }

  const posts = (data || []).map((p) => ({
    ...p,
    comment_count: commentCounts[p.id] || 0,
  }));

  return NextResponse.json({
    posts,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// POST /api/board/[board] — create post
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { board } = await ctx.params;
  if (!VALID_BOARDS.has(board)) {
    return NextResponse.json({ error: "Invalid board" }, { status: 400 });
  }

  const body = await req.json();
  const { nickname, title, content, password, adminPassword } = body;

  if (!nickname?.trim() || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "닉네임, 제목, 내용을 모두 입력해주세요." }, { status: 400 });
  }
  if (nickname.trim().length > 20) {
    return NextResponse.json({ error: "닉네임은 20자 이내로 입력해주세요." }, { status: 400 });
  }
  if (title.trim().length > 100) {
    return NextResponse.json({ error: "제목은 100자 이내로 입력해주세요." }, { status: 400 });
  }
  if (content.trim().length > 5000) {
    return NextResponse.json({ error: "내용은 5000자 이내로 입력해주세요." }, { status: 400 });
  }

  if (board === "notice") {
    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "관리자 비밀번호가 틀렸습니다." }, { status: 403 });
    }
  }

  if (board !== "notice" && (!password || password.length < 4)) {
    return NextResponse.json({ error: "글 비밀번호는 4자 이상 입력해주세요." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      board,
      nickname: nickname.trim(),
      title: title.trim(),
      content: content.trim(),
      password: board === "notice" ? ADMIN_PASSWORD : password,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
