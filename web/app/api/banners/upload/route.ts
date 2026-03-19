import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/banners/upload — upload image to Supabase Storage
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `banner-${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("banners")
    .upload(fileName, file, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("banners").getPublicUrl(data.path);

  return NextResponse.json({ url: urlData.publicUrl });
}
