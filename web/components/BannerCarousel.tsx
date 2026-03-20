"use client";

import { useState, useEffect, useCallback } from "react";

interface Banner {
  id: string;
  image_url: string;
  link_url: string;
  title: string;
}

export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((d) => setBanners(d.banners || []))
      .catch(() => {});
  }, []);

  // Auto-rotate every 4 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const goTo = useCallback((idx: number) => setCurrent(idx), []);

  if (banners.length === 0) return null;

  const banner = banners[current];

  const Wrapper = banner.link_url ? "a" : "div";
  const wrapperProps = banner.link_url
    ? { href: banner.link_url, target: banner.link_url.startsWith("http") ? "_blank" : undefined, rel: banner.link_url.startsWith("http") ? "noopener noreferrer" : undefined }
    : {};

  return (
    <div className="mb-5">
      <Wrapper
        {...(wrapperProps as any)}
        className="block relative rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
      >
        <div className="relative aspect-video bg-slate-100">
          {banners.map((b, i) => (
            <img
              key={b.id}
              src={b.image_url}
              alt={b.title || "배너"}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                i === current ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
      </Wrapper>

      {/* Dots */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? "w-5 h-2 bg-green-500"
                  : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
