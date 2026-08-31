import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/md/"] }],
    sitemap: "https://gigainvestors.com/sitemap.xml",
    host: "https://gigainvestors.com",
  };
}
