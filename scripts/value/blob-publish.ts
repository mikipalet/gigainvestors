import {assertUploadReady} from './publication-upload-guard';
import {put, get} from '@vercel/blob';
import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {BLOB_CURRENT, BLOB_IMMUTABLE, blobVersionPrefix, privateBlobToken} from '../../lib/value/blob-publication';
import {isImmutablePath, isPublishedPath} from '../../lib/value/published-path';

/** The publish lock protects this tree; the pointer switches only after all uploads. */
export async function uploadPublishedSnapshot(repo: string) {
  assertUploadReady(repo);
  const token = privateBlobToken();
  const files: string[] = [];
  async function walk(dir = '') {
    for (const entry of await readdir(path.join(repo, dir), {withFileTypes: true})) {
      if (entry.name.startsWith('.')) continue;
      const file = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && isPublishedPath(file)) files.push(file);
    }
  }
  await walk(); files.sort();
  if (!files.includes('meta.json')) throw new Error('Missing published meta.json');
  const hash = createHash('sha256');
  let bytes = 0;
  const digests = new Map<string, string>();
  for (const file of files) {
    const data = await readFile(path.join(repo, file)); bytes += data.length;
    const digest = createHash('sha256').update(data).digest('hex'); digests.set(file, digest);
    hash.update(file).update('\0').update(digest).update('\n');
  }
  const version = hash.digest('hex'), prefix = blobVersionPrefix(version);
  // A killed runner may resume verification after a completed upload.
  const current = await get(BLOB_CURRENT, {access:'private', token, useCache:false});
  const pointer = current?.statusCode === 200 ? await new Response(current.stream).json() : null;
  if (pointer?.version === version && pointer?.schema === 2) {
    return {version, files:files.length, bytes, uploaded:false};
  }
  let cursor = 0;
  await Promise.all(Array.from({length:16}, async () => {
    while (cursor < files.length) {
      const file = files[cursor++], data = await readFile(path.join(repo, file));
      if (createHash('sha256').update(data).digest('hex') !== digests.get(file)) throw new Error('Published tree changed during Blob upload');
      const options = {access:'private' as const, token, addRandomSuffix:false, allowOverwrite:true, contentType:'application/json', cacheControlMaxAge:31536000};
      await put(`${prefix}/${file}`, data, options);
      // Retain content-addressed files for clients holding older cached metadata.
      if (isImmutablePath(file)) await put(`${BLOB_IMMUTABLE}/${file}`, data, options);
    }
  }));
  // The locked, committed candidate must still match the receipt at the switch.
  assertUploadReady(repo);
  // Only this mutable pointer is overwritten. Readers never observe a partial snapshot.
  await put(BLOB_CURRENT, JSON.stringify({version, schema:2}), {access:'private', token, addRandomSuffix:false, allowOverwrite:true, contentType:'application/json', cacheControlMaxAge:60});
  console.log(`blob publish: ${files.length} files, ${bytes} bytes, version ${version}`);
  return {version, files:files.length, bytes, uploaded:true};
}
