import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { qualities: [45,60,75], formats: ["image/avif", "image/webp"] },
  distDir: '.next',
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/faces/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:path*", headers: [{ key: "Vary", value: "Accept, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding" }] },
    ];
  },
};

export default nextConfig;
