import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

// GET /api/banners — list active banners
export async function GET() {
  const { data, error } = await supabase
    .from("banners")
    .select("id, image_url, link_url, title, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ banners: data || [] });
}

// POST /api/banners — create banner (admin only)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { image_url, link_url, title, sort_order, adminPassword } = body;

  if (adminPassword !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "관리자 비밀번호가 틀렸습니다." }, { status: 403 });
  }

  if (!image_url) {
    return NextResponse.json({ error: "이미지 URL이 필요합니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("banners")
    .insert({ image_url, link_url: link_url || "", title: title || "", sort_order: sort_order || 0 })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}

// DELETE /api/banners — delete banner (admin only)
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id, adminPassword } = body;

  if (adminPassword !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "관리자 비밀번호가 틀렸습니다." }, { status: 403 });
  }

  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
