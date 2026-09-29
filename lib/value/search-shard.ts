/** Version 1: two-character leaves; split prefixes retain their own head file. */
export interface SearchManifest {
  version: number;
  split: string[];
  maxPrefix: number;
  localPrefixes?: Record<string, string>;
}

export const SEARCH_KEYS = '0123456789abcdefghijklmnopqrstuvwxyz';
export const SEARCH_CHARACTERS = SEARCH_KEYS + '&-.';

export function normalizeSearch(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

/** Empty/unsupported queries have no shard. One-character queries use c_.json. */
export function shardKeyFor(query: string, manifest: SearchManifest): string {
  const token = normalizeSearch(query.trim()).split(/\s/)[0];
  if (!token) return '';
  if (!SEARCH_KEYS.includes(token[0])) {
    const prefix = Object.keys(manifest.localPrefixes ?? {}).filter(p => token.startsWith(p)).sort((a,b) => b.length-a.length)[0];
    return prefix ? manifest.localPrefixes![prefix] : '';
  }
  if (token.length === 1) return `${token}_`;
  let key = token.slice(0, 2);
  if (!SEARCH_CHARACTERS.includes(key[1])) return `${token[0]}_`;
  const split = new Set(manifest.split);
  while (key.length < token.length && key.length < manifest.maxPrefix && split.has(key)) {
    const next = token[key.length];
    if (!SEARCH_CHARACTERS.includes(next)) break;
    key += next;
  }
  return key;
}
