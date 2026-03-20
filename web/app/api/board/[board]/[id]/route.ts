import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const VALID_BOARDS = new Set<string>(["free", "suggestion", "notice"]);

interface RouteContext {
  params: Promise<{ board: string; id: string }>;
}

// GET /api/board/[board]/[id] — get single post + increment view count
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { board, id } = await ctx.params;
  if (!VALID_BOARDS.has(board)) {
    return NextResponse.json({ error: "Invalid board" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id, board, nickname, title, content, view_count, like_count, pinned, created_at")
    .eq("id", id)
    .eq("board", board)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }

  // Increment view count (fire and forget)
  supabase
    .from("posts")
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq("id", id)
    .then();

  return NextResponse.json({ ...data, view_count: (data.view_count || 0) + 1 });
}

// PATCH /api/board/[board]/[id] — like or pin toggle
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { board, id } = await ctx.params;
  if (!VALID_BOARDS.has(board)) {
    return NextResponse.json({ error: "Invalid board" }, { status: 400 });
  }

  const body = await req.json();
  const { action, adminPassword, password, title, content } = body;

  if (action === "edit") {
    if (!password) {
      return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
    }
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "제목과 내용을 입력해주세요." }, { status: 400 });
    }
    // Check password: master or post password
    const masterPassword = process.env.ADMIN_PASSWORD || "8054";
    if (password !== masterPassword) {
      const { data: post } = await supabase
        .from("posts")
        .select("password")
        .eq("id", id)
        .single();
      if (!post || post.password !== password) {
        return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 403 });
      }
    }
    const { error } = await supabase
      .from("posts")
      .update({ title: title.trim(), content: content.trim() })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "like") {
    // Increment like count
    const { data } = await supabase
      .from("posts")
      .select("like_count")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("posts")
      .update({ like_count: ((data?.like_count) || 0) + 1 })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ like_count: ((data?.like_count) || 0) + 1 });
  }

  if (action === "pin" || action === "unpin") {
    const masterPassword = process.env.ADMIN_PASSWORD || "8054";
    if (adminPassword !== masterPassword) {
      return NextResponse.json({ error: "관리자 비밀번호가 틀렸습니다." }, { status: 403 });
    }
    const { error } = await supabase
      .from("posts")
      .update({ pinned: action === "pin" })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ pinned: action === "pin" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// DELETE /api/board/[board]/[id] — delete post with password
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { board, id } = await ctx.params;
  if (!VALID_BOARDS.has(board)) {
    return NextResponse.json({ error: "Invalid board" }, { status: 400 });
  }

  const body = await req.json();
  const { password } = body;

  if (!password) {
    return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
  }

  // Master password allows deleting any post
  const masterPassword = process.env.ADMIN_PASSWORD || "8054";
  if (password === masterPassword) {
    const { error } = await supabase.from("posts").delete().eq("id", id).eq("board", board);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const { data, error } = await supabase.rpc("delete_post_with_password", {
    p_id: id,
    p_password: password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
