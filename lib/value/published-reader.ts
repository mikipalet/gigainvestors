import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {VALUE_DATA_TAG} from './data-source';
import {BLOB_CURRENT, BLOB_IMMUTABLE, blobVersionPrefix, privateBlobOrigin, privateBlobToken} from './blob-publication';
import {isImmutablePath, isPublishedPath} from './published-path';

/** Node-compatible origin reader. Web consumers use the server-only wrapper. */
export async function readPublishedBytes(file: string, revalidate = 300): Promise<Uint8Array | null> {
  if (!isPublishedPath(file)) throw new Error('Invalid value store path');
  if (process.env.VALUE_STORE_DIR) {
    try { return new Uint8Array(await readFile(path.join(process.env.VALUE_STORE_DIR, file))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  const token = privateBlobToken(), origin = privateBlobOrigin(token);
  const options = {
    headers: {Authorization: `Bearer ${token}`},
    redirect: 'error' as const, next: {revalidate, tags: [VALUE_DATA_TAG]},
  };
  // Bypass Blob's mutable-object CDN cache; Next's tagged cache remains purgeable.
  let prefix = BLOB_IMMUTABLE;
  if (!isImmutablePath(file)) {
    const pointer = await fetch(`${origin}/${BLOB_CURRENT}?cache=0`, {...options, signal: AbortSignal.timeout(30_000)});
    if (!pointer.ok) throw new Error(`Value store pointer returned ${pointer.status}`);
    const {version} = await pointer.json();
    prefix = blobVersionPrefix(version);
  }
  const encoded = file.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${origin}/${prefix}/${encoded}`, {...options, signal: AbortSignal.timeout(30_000)});
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Value store returned ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
