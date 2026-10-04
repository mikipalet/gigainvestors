import type { MetadataRoute } from "next";


export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = 'https://gigainvestors.com';
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/md/"] }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
