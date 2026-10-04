import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {VALUE_DATA_TAG} from './data-source';
import {isPublishedPath} from './published-path';

/** Shared server-only origin reader for HTML, the paid API and /data/v. */
export async function readPublishedBytes(file: string, revalidate = 300): Promise<Uint8Array | null> {
  if (!isPublishedPath(file)) throw new Error('Invalid value store path');
  if (process.env.VALUE_STORE_DIR) {
    try { return new Uint8Array(await readFile(path.join(process.env.VALUE_STORE_DIR, file))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  const token = process.env.VALUE_DATA_GITHUB_TOKEN;
  const fallback = process.env.VALUE_DATA_PUBLIC_FALLBACK === '1' && process.env.VERCEL_ENV !== 'production';
  if (!token && !fallback) throw new Error('VALUE_DATA_GITHUB_TOKEN is required');
  const encoded = file.split('/').map(encodeURIComponent).join('/');
  const url = token
    ? `https://api.github.com/repos/mikipalet/gigainvestors-value-data/contents/${encoded}?ref=main`
    : `https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/${encoded}`;
  const response = await fetch(url, {
    headers: token ? {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28'} : {},
    // Never forward credentials to a redirect destination or log upstream bodies.
    redirect: 'error', next: {revalidate, tags: [VALUE_DATA_TAG]}, signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Value store returned ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
