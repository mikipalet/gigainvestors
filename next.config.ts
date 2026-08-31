import type { NextConfig } from "next";

const wantsMarkdown = [{ type: "header" as const, key: "accept", value: "(.*text/markdown.*)" }];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/faces/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:path*", headers: [{ key: "Vary", value: "Accept" }] },
    ];
  },
  async rewrites() {
    return {
      // Accept: text/markdown gets the markdown twin at the same URL (acceptmarkdown.com).
      beforeFiles: [
        { source: "/", has: wantsMarkdown, destination: "/md/home" },
        { source: "/s/:ticker", has: wantsMarkdown, destination: "/md/s/:ticker" },
        { source: "/:slug(about|privacy)", has: wantsMarkdown, destination: "/md/page/:slug" },
        { source: "/newsletter/:issue", has: wantsMarkdown, destination: "/md/issue/:issue" },
        { source: "/:code([A-Za-z]{1,8})", has: wantsMarkdown, destination: "/md/i/:code" },
      ],
      afterFiles: [],
      fallback: [{ source: "/:path*", has: wantsMarkdown, destination: "/md/missing" }],
    };
  },
};

export default nextConfig;
