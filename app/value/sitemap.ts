import type { MetadataRoute } from "next";
import { getTopIds } from "@/lib/value/store";

export const revalidate = 86400;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ids = await getTopIds();
  return [{ url: "https://value.gigainvestors.com/" }, ...ids.map((id) => ({ url: `https://value.gigainvestors.com/${encodeURIComponent(id.toLowerCase())}` }))];
}
