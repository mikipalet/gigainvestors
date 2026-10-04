/** Shared private-store namespace. No credentials or URLs enter browser code. */
export const BLOB_IMMUTABLE = 'value/immutable';
export const BLOB_CURRENT = 'value/current.json';
export const blobVersionPrefix = (version: string) => {
  if (!/^[a-f0-9]{64}$/.test(version)) throw new Error('Invalid value Blob version');
  return `value/versions/${version}`;
};
export function privateBlobToken(): string {
  const token = process.env.VALUE_DATA_READ_WRITE_TOKEN;
  if (!token || !/^vercel_blob_rw_[a-zA-Z0-9]+_/.test(token)) throw new Error('VALUE_DATA_READ_WRITE_TOKEN is required');
  return token;
}
export function privateBlobOrigin(token: string): string {
  return `https://${token.split('_')[3].toLowerCase()}.private.blob.vercel-storage.com`;
}
