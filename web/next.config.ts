import type { NextConfig } from "next";

const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL ?? "https://pub-777d764118c647a2a715fb0b17072419.r2.dev";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Proxy /r2/* to the R2 public bucket so external services that
    // reject pub-*.r2.dev (e.g. Meta's IG image fetcher) can fetch
    // through gcnote.co.kr instead.
    return [
      {
        source: "/r2/:path*",
        destination: `${R2_PUBLIC_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
