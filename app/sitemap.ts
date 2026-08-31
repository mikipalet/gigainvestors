import type { MetadataRoute } from "next";
import { getIndex, getSearchIndex } from "@/lib/data";
import { listIssues } from "@/lib/newsletter/store";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [index, search] = await Promise.all([getIndex(), getSearchIndex()]);
  const lastModified = index ? new Date(index.generatedAt) : new Date();
  const base = "https://gigainvestors.com";
  return [
    { url: `${base}/`, lastModified },
    ...["about", "privacy", "munger", "newsletter"].map((p) => ({ url: `${base}/${p}`, lastModified })),
    ...listIssues().map((i) => ({ url: `${base}/newsletter/${i.slug}`, lastModified: new Date(i.builtAt) })),
    ...(index?.investors ?? []).map((i) => ({ url: `${base}/${i.code}`, lastModified })),
    ...(search?.stocks ?? []).map((s) => ({ url: `${base}/s/${encodeURIComponent(s.t)}`, lastModified })),
  ];
}
