import {getTopIds} from '@/lib/value/store';
import {companyPath} from '@/lib/company-route';
import type { MetadataRoute } from "next";
import { getIndex, getSearchIndex } from "@/lib/data";
import { listIssues } from "@/lib/newsletter/store";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [index, search, ids] = await Promise.all([getIndex(), getSearchIndex(),getTopIds()]);
  const lastModified = index ? new Date(index.generatedAt) : new Date();
  const base = "https://gigainvestors.com";
  return [
    { url: `${base}/`, lastModified },
    ...["value", "value/method", "value/forward", "about", "privacy", "munger", "newsletter"].map((p) => ({ url: `${base}/${p}`, lastModified })),
    ...listIssues().map((i) => ({ url: `${base}/newsletter/${i.slug}`, lastModified: new Date(i.builtAt) })),
    ...(index?.investors ?? []).map((i) => ({ url: `${base}/${i.code}`, lastModified })),
    ...[...new Set([...(search?.stocks??[]).map(s=>companyPath(s.t)),...ids.map(companyPath)])].map(p=>({url:`${base}${p}`,lastModified})),
  ];
}
