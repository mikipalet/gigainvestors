import type { MetadataRoute } from "next";
import { headers } from 'next/headers';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host')?.split(':')[0].toLowerCase();
  const origin = host === 'value.gigainvestors.com' ? 'https://value.gigainvestors.com' : 'https://gigainvestors.com';
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/md/"] }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
