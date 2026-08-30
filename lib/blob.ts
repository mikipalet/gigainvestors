import { head, list, put } from "@vercel/blob";

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const meta = await head(key);
    const res = await fetch(meta.url, { cache: "no-store" });
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

export async function listKeys(prefix: string): Promise<string[]> {
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs.map((b) => b.pathname));
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}
