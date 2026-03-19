"use client";

import { useState, useEffect, useRef } from "react";

interface Banner {
  id: string;
  image_url: string;
  link_url: string;
  title: string;
  sort_order: number;
}

export default function BannerAdmin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchBanners = () => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((d) => setBanners(d.banners || []));
  };

  useEffect(() => {
    if (authenticated) fetchBanners();
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) setAuthenticated(true);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("이미지를 선택해주세요."); return; }

    setUploading(true);
    setError("");

    try {
      // 1. Upload image
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/banners/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { setError(uploadData.error); return; }

      // 2. Create banner record
      const createRes = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: uploadData.url,
          link_url: linkUrl,
          title,
          sort_order: sortOrder,
          adminPassword: password,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) { setError(createData.error); return; }

      // Reset form
      setTitle("");
      setLinkUrl("");
      setSortOrder(banners.length);
      if (fileRef.current) fileRef.current.value = "";
      fetchBanners();
    } catch {
      setError("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 배너를 삭제하시겠습니까?")) return;
    await fetch("/api/banners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, adminPassword: password }),
    });
    fetchBanners();
  };

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <h1 className="text-xl font-black text-slate-800 mb-4 text-center">배너 관리</h1>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
            autoFocus
          />
          <button className="w-full btn-primary !rounded-xl !py-3 text-sm">로그인</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-black text-slate-800 mb-5">배너 관리</h1>

      {/* Upload form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        <h2 className="text-sm font-bold text-slate-700 mb-3">새 배너 추가</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">이미지</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-green-700 hover:file:bg-green-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">제목 (선택)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="배너 제목"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">링크 URL (선택)</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/study 또는 https://..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">순서 (낮을수록 먼저)</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-100"
            />
          </div>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="btn-primary !rounded-xl !py-2.5 !px-6 text-sm disabled:opacity-50"
          >
            {uploading ? "업로드 중..." : "배너 추가"}
          </button>
        </div>
      </div>

      {/* Banner list */}
      <h2 className="text-sm font-bold text-slate-700 mb-3">현재 배너 ({banners.length}개)</h2>
      {banners.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">등록된 배너가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <img src={b.image_url} alt={b.title} className="w-32 h-20 object-cover rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{b.title || "(제목 없음)"}</p>
                <p className="text-xs text-slate-400 truncate">{b.link_url || "링크 없음"}</p>
                <p className="text-xs text-slate-300">순서: {b.sort_order}</p>
              </div>
              <button
                onClick={() => handleDelete(b.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors shrink-0"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
