import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ postId: string; commentId: string }>;
}

// DELETE /api/comments/[postId]/[commentId] — delete comment with password
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { commentId } = await ctx.params;
  const body = await req.json();
  const { password } = body;

  if (!password) {
    return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
  }

  // Master password
  const masterPassword = process.env.ADMIN_PASSWORD || "8054";
  if (password === masterPassword) {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const { data, error } = await supabase.rpc("delete_comment_with_password", {
    p_id: commentId,
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
