import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ postId: string }>;
}

// GET /api/comments/[postId] — list comments for a post
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { postId } = await ctx.params;

  const { data, error } = await supabase
    .from("comments")
    .select("id, post_id, nickname, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST /api/comments/[postId] — create a comment
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { postId } = await ctx.params;
  const body = await req.json();
  const { nickname, content, password } = body;

  if (!nickname?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "닉네임과 내용을 입력해주세요." }, { status: 400 });
  }
  if (nickname.trim().length > 20) {
    return NextResponse.json({ error: "닉네임은 20자 이내로 입력해주세요." }, { status: 400 });
  }
  if (content.trim().length > 1000) {
    return NextResponse.json({ error: "댓글은 1000자 이내로 입력해주세요." }, { status: 400 });
  }
  if (!password || password.length < 4) {
    return NextResponse.json({ error: "비밀번호는 4자 이상 입력해주세요." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      nickname: nickname.trim(),
      content: content.trim(),
      password,
    })
    .select("id, post_id, nickname, content, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
