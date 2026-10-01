import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { aboutSentence, cleanName, englishName, parseEdinetNames, resolveLogo, yahooEnglishName, writeNewJson } from '@/lib/value/enrichment';
import type { Company } from '@/lib/value/types';
const company = { id: '8058.JP', code: '8058', exchange: 'JP', country: 'JP', name: '三菱商事株式会社', edinetCode: 'E02529' } as Company;
const dirs: string[] = [];
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); });
describe('round 7 enrichment', () => {
  it('prefers the EDINET English name and preserves local names', () => {
    expect(englishName(company, { Name: 'Vendor name' }, 'Mitsubishi Corporation')).toEqual({ nameEn: 'Mitsubishi Corporation', nameLocal: '三菱商事株式会社' });
    expect(englishName(company, { Name: 'Vendor name' }, null)).toEqual({ nameEn: 'Vendor name', nameLocal: '三菱商事株式会社' });
    expect(englishName(company, {}, null, 'Yahoo name').nameEn).toBe('Yahoo name');
    expect(englishName(company, {}, null).nameEn).toBe('8058.JP');
    expect(englishName({...company,name:'English universe name'}, {Name:'三菱商事株式会社'}, null).nameLocal).toBe('三菱商事株式会社');
    expect(cleanName('  Café\u00a0“Widgets” Co Ltd ’  ')).toBe('Café "Widgets" Co Ltd \'');
  });
  it('parses the actual code-list columns, quoted commas and escaped quotes', () => {
    const csv = 'ダウンロード実行日,2026\nＥＤＩＮＥＴコード,提出者名,提出者名（英字）,証券コード\n"E02529","三菱","Mitsubishi, ""Trading"" Corporation","80580"\n';
    expect(parseEdinetNames(csv)).toEqual({ E02529: 'Mitsubishi, "Trading" Corporation' });
  });
  it('extracts one plain English sentence without cutting words or stopping at Inc.', () => {
    expect(aboutSentence('<p>Acme Inc. makes widgets. It also sells services.</p>')).toBe('Acme Inc. makes widgets.');
    const text = aboutSentence('Acme manufactures ' + 'industrial '.repeat(15) + 'widgets. Second sentence.');
    expect(text!.length).toBeLessThanOrEqual(110);
    expect(text).toBe('Acme manufactures ' + 'industrial '.repeat(8).trimEnd() + '…');
    expect(aboutSentence('日本の会社です。')).toBeNull();
    expect(aboutSentence(null)).toBeNull();
    expect(aboutSentence('Acme makes widgets. 会社の詳細です。')).toBe('Acme makes widgets.');
  });
  it('requires a decoded 64px image and rejects an unverified favicon', async () => {
    vi.stubGlobal('fetch', async () => new Response(new Uint8Array(await sharp({create:{width:64,height:64,channels:4,background:'#ffffff'}}).png().toBuffer()), { status: 200, headers: { 'content-type': 'image/png' } }));
    expect(await resolveLogo({ LogoURL: '/img/logos/KO.png', WebURL: 'https://www.coke.com/a' })).toEqual({ logo: 'https://eodhd.com/img/logos/KO.png', source: 'eodhd' });
    vi.stubGlobal('fetch', async () => new Response('not an image', { status: 200, headers: { 'content-type': 'text/html' } }));
    expect(await resolveLogo({ LogoURL: '/bad', WebURL: 'https://www.coke.com/a' })).toEqual({logo:null,source:null});
    expect(await resolveLogo({ WebURL: 'javascript:alert(1)' })).toEqual({ logo: null, source: null });
  });
  it('retries transient logo throttling before choosing a favicon', async () => {
    let responses=0;
    vi.stubGlobal('fetch', async () => ++responses===1 ? new Response('',{status:429,headers:{'retry-after':'0'}})
      : new Response(new Uint8Array(await sharp({create:{width:64,height:64,channels:4,background:'#ffffff'}}).png().toBuffer()),{status:200,headers:{'content-type':'image/png'}}));
    expect((await resolveLogo({LogoURL:'/img/logos/US/ko.png',WebURL:'https://coke.com'})).source).toBe('eodhd');
  });
  it('caches Yahoo longName and never overwrites an existing cache', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'value-enrich-')); dirs.push(dir); vi.stubEnv('VALUE_CORPUS_DIR', dir);
    vi.stubGlobal('fetch', async () => Response.json({ chart: { result: [{ meta: { longName: 'Mitsubishi Corporation' } }] } }));
    expect(await yahooEnglishName(company)).toBe('Mitsubishi Corporation');
    vi.stubGlobal('fetch', () => { throw new Error('cached request must not fetch'); });
    expect(await yahooEnglishName(company)).toBe('Mitsubishi Corporation');
    expect(writeNewJson('enrichment-v7/example.json', { a: 1 })).toBe(true);
    expect(writeNewJson('enrichment-v7/example.json', { a: 2 })).toBe(false);
    expect(JSON.parse(readFileSync(path.join(dir, 'enrichment-v7/example.json'), 'utf8'))).toEqual({ a: 1 });
  });
});
