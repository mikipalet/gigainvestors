import type { MetadataRoute } from "next";
import { getIndex, getSearchIndex } from "@/lib/data";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [index, search] = await Promise.all([getIndex(), getSearchIndex()]);
  const lastModified = index ? new Date(index.generatedAt) : new Date();
  const base = "https://gigainvestors.com";
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    ...["about", "privacy", "munger", "newsletter"].map((p) => ({ url: `${base}/${p}`, lastModified, changeFrequency: "yearly" as const, priority: 0.3 })),
    ...(index?.investors ?? []).map((i) => ({ url: `${base}/${i.code}`, lastModified, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...(search?.stocks ?? []).map((s) => ({ url: `${base}/s/${encodeURIComponent(s.t)}`, lastModified, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
