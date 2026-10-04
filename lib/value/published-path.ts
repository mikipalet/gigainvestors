/** Only the published store contract, never arbitrary repository files. */
export function isPublishedPath(file: string): boolean {
  return !file.split('/').includes('..') && /^(?:(?:meta|top|aliases)|views\/[a-f0-9]{24}|logos\/[a-f0-9]{64}|search\/[a-z0-9][a-z0-9_&.\-]*|index\/(?:default|[A-Z]{2})|prices\/[A-Z]{2}|dossiers\/\d{3}|history\/(?:index|companies|\d{4}(?:Q[1-4])?)|forward\/(?:index|\d{4}-\d{2}-\d{2}))\.json$/.test(file);
}
export const isImmutablePath = (file: string) => /^(?:views\/[a-f0-9]{24}|logos\/[a-f0-9]{64})\.json$/.test(file);
