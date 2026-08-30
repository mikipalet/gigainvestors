import { put } from "@vercel/blob";

// The store is public with stable URLs; deriving the URL from the token avoids a
// billable head() API operation on every read.
export function blobUrl(key: string): string {
  const id = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3]?.toLowerCase();
  return `https://${id}.public.blob.vercel-storage.com/${key}`;
}

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(blobUrl(key), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, data: unknown): Promise<string> {
  const r = await put(key, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return r.url;
}

