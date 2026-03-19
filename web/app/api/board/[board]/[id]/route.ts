import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const VALID_BOARDS = new Set<string>(["free", "suggestion", "notice"]);

interface RouteContext {
  params: Promise<{ board: string; id: string }>;
}

// GET /api/board/[board]/[id] — get single post
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { board, id } = await ctx.params;
  if (!VALID_BOARDS.has(board)) {
    return NextResponse.json({ error: "Invalid board" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id, board, nickname, title, content, created_at")
    .eq("id", id)
    .eq("board", board)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(data);
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
