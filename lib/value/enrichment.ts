import { randomUUID } from 'node:crypto';
import { linkSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { corpusPath, readCorpusJson } from './corpus';
import { createLimiter, fetchWithRetry } from './http';
import { yahooSymbol } from './price-history';
import type { Company } from './types';

export interface GeneralInfo { Name?: string; Description?: string; LogoURL?: string; WebURL?: string }
export interface Enrichment { nameEn: string; nameLocal?: string; logo: string | null; about: string | null; nameSource: string; logoSource: string | null }
export function cleanName(name: string): string {
  return name.normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}
export function isLatinName(name: string | null | undefined): name is string {
  return !!name && /\p{Script=Latin}/u.test(name) && ![...name].some(c => /\p{L}/u.test(c) && !/\p{Script=Latin}/u.test(c));
}
export function englishName(company: Company, general: GeneralInfo, edinet: string | null, yahoo?: string | null): { nameEn: string; nameLocal?: string } {
  const choices = [company.country === 'JP' ? edinet : null, general.Name, company.nameEn, company.name, yahoo].map(n => n ? cleanName(n) : null);
  const local = company.nameLocal ?? company.nativeName ?? (!isLatinName(company.name) ? company.name : null)
    ?? (general.Name && !isLatinName(cleanName(general.Name)) ? general.Name : null);
  return { nameEn: choices.find(isLatinName) ?? company.id, ...(local ? { nameLocal: local } : {}) };
}
export function aboutSentence(description: string | null | undefined): string | null {
  if (!description) return null;
  const plain = cleanName(description.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/g, "'"));
  // Corporate abbreviations and initials are not sentence boundaries.
  const boundary = /[.!?](?:\s+|$)/g;
  let first = plain;
  for (const match of plain.matchAll(boundary)) {
    const prefix = plain.slice(0, match.index! + 1);
    if (/(?:\b(?:Inc|Ltd|Co|Corp|plc|S\.A|N\.V|U\.S)|\b[A-Z])\.$/i.test(prefix)) continue;
    first = prefix; break;
  }
  if (!isLatinName(first)) return null;
  if (first.length <= 110) return first || null;
  const cut = first.slice(0, 110).lastIndexOf(' ');
  return cut > 0 ? first.slice(0, cut).replace(/[,;:]$/, '') + '…' : null;
}
export function parseEdinetNames(csv: string): Record<string, string> {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) rows.push([...row, cell.replace(/\r$/, '')]);
  const header = rows.findIndex(r => r.some(c => c.normalize('NFKC') === 'EDINETコード'));
  if (header < 0) throw new Error('EDINET code list header missing');
  const code = rows[header].findIndex(c => c.normalize('NFKC') === 'EDINETコード');
  const english = rows[header].findIndex(c => c.normalize('NFKC') === '提出者名(英字)');
  if (english < 0) throw new Error('EDINET English filer column missing');
  return Object.fromEntries(rows.slice(header + 1).filter(r => /^E\d+$/.test(r[code]) && isLatinName(cleanName(r[english] ?? ''))).map(r => [r[code], cleanName(r[english])]));
}

/** Atomic create-only writes: no rename can replace another stage's files. */
export function writeNewJson(rel: string, data: unknown): boolean {
  if (!/^(enrichment-v7|history-v7)\//.test(rel) || rel.split('/').includes('..')) throw new Error('Invalid round 7 cache path');
  const destination = corpusPath(rel), temp = `${destination}.${randomUUID()}.tmp`;
  mkdirSync(path.dirname(destination), { recursive: true });
  try {
    writeFileSync(temp, JSON.stringify(data) + '\n', { flag: 'wx' });
    try { linkSync(temp, destination); return true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false; throw error; }
  } finally { rmSync(temp, { force: true }); }
}
const yahooLimit = createLimiter({ perSecond: 2 });
export async function yahooEnglishName(company: Company): Promise<string | null> {
  const file = `enrichment-v7/yahoo/${company.id}.json`;
  const cached = readCorpusJson<{ name: string | null }>(file);
  if (cached) return cached.name;
  let name: string | null = null;
  try {
    // Chart metadata is Yahoo's unauthenticated quote and carries longName.
    const symbol = yahooSymbol(company);
    const response = await yahooLimit(() => fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15_000) }));
    if (response.ok) {
      const data = await response.json();
      const value = data?.chart?.result?.[0]?.meta?.longName;
      if (typeof value === 'string' && isLatinName(cleanName(value))) name = cleanName(value);
    }
  } catch { /* Missing/unsupported quotes are cached; the display falls back to the ID. */ }
  writeNewJson(file, { name, fetchedAt: new Date().toISOString() });
  return name;
}
const logoLimit = createLimiter({ perSecond: 10 });
const fetchLogo: typeof fetch = (url, init) => fetchWithRetry(String(url), {
  ...init, signal: AbortSignal.timeout(60_000), retries: 3, beforeAttempt: () => logoLimit(async () => {}),
});
export async function resolveLogo(general: GeneralInfo, request: typeof fetch = fetchLogo): Promise<{ logo: string | null; source: string | null }> {
  if (general.LogoURL) {
    try {
      const url = new URL(general.LogoURL, 'https://eodhd.com');
      if (url.origin === 'https://eodhd.com') {
        const response = await request(url, { signal: AbortSignal.timeout(10_000) });
        const png = response.status === 200 && response.headers.get('content-type')?.split(';')[0].trim() === 'image/png';
        const bytes = png ? new Uint8Array(await response.arrayBuffer()) : null;
        if (!png) await response.body?.cancel();
        if (bytes && [137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b)) return { logo: url.href, source: 'eodhd' };
      }
    } catch { /* A bad vendor logo falls back to the issuer's website. */ }
  }
  try {
    const url = new URL(general.WebURL?.includes('://') ? general.WebURL : `https://${general.WebURL ?? ''}`);
    if (['https:', 'http:'].includes(url.protocol) && url.hostname.includes('.') && !url.username && !url.password) {
      return { logo: `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`, source: 'favicon' };
    }
  } catch { /* No usable website. */ }
  return { logo: null, source: null };
}
export function enrichedCompany(company: Company, cachedOnly = false): Company {
  const cached = readCorpusJson<Enrichment>(`enrichment-v7/companies/${company.id}.json`);
  if (!cached && cachedOnly) return company;
  const names = cached ?? englishName(company, {}, null);
  const logo = readCorpusJson<{logo:string|null}>(`enrichment-v7/logos/${company.id}.json`);
  const about = readCorpusJson<{about:string}>(`enrichment-v7/about/${company.id}.json`);
  return { ...company, nameEn: names.nameEn, ...(names.nameLocal ? { nameLocal: names.nameLocal } : {}),
    ...(cached ? { logo: logo?.logo ?? cached.logo, about: about?.about ?? cached.about } : {}), name: names.nameEn };
}
