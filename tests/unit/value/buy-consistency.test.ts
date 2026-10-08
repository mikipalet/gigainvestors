import { buildOutput } from '@/lib/value/build-output';
import { assertIndexConsistency } from '@/lib/value/consistency';
import { mainCompanies,mainZones } from '@/lib/value/main-layout';
import type { Analysis,Dossier,IndexRow,PriceMap,StoreMeta } from '@/lib/value/types';
import { execFileSync } from 'node:child_process';
import { readFileSync,readdirSync } from 'node:fs';
import path from 'node:path';
import { describe,expect,it } from 'vitest';

const root = path.resolve('tests/fixtures/value/store');
const dossiers = readdirSync(path.join(root, 'dossiers')).flatMap(file => Object.values(JSON.parse(readFileSync(path.join(root, 'dossiers', file), 'utf8')) as Record<string, Dossier>));
const base = dossiers.find(d => d.id === 'KO.US')!;
function company(id: string, requiredMos = .25): Analysis {
  const a = structuredClone(base);
  a.id = id; a.company = { ...a.company, id, country: 'US', currency: 'USD', marketCapUsd: null };
  a.requiredMos = requiredMos;
  a.valuation = { ...a.valuation!, currency: 'USD', normalized: 1000, shares: 100, netCash: 0, terminalGrowth: 0, growth: 0, discountRate: .1, perShare: { low: 80, mid: 100, high: 120 }, perShareTrading: undefined, assumptions: [] };
  return a;
}
function snapshot() {
  const rows = [company('BUY.US'), company('BOUNDARY.US', .35), company('WAIT.US', .5), company('NEAR.US'), company('FLAG.US'), company('MISSING.US'), company('FX.US'), company('SEED.US')];
  rows[3].tests.moat.result = 'fail';
  rows[4].valuation!.assumptions = ['Unverified share count'];
  rows[6].valuation!.currency = 'EUR';
  const prices: PriceMap = Object.fromEntries(rows.filter(r => r.id !== 'MISSING.US').map(r => [r.id, [60, '2026-09-29']]));
  prices['BOUNDARY.US'] = [65, '2026-09-29'];
  prices['SEED.US'] = [60, '2026-09-29', 'seed'];
  return buildOutput({ analyses: rows, prices, holdersByTicker: {}, investorNames: {}, fx: {} }).files;
}
function buyCount(rows: IndexRow[], prices: PriceMap) {
 return mainZones(mainCompanies(rows.map(row=>({row,quote:prices[row.id]?.[0]??null,mos:null})))).buy.length;
}
describe('published buy-price contract', () => {
  it('uses own margin, quality, trading currency and review status for the same funnel, rows and main view buys', () => {
    const files = snapshot(), rows = files['index/default.json'] as IndexRow[], prices = files['prices/US.json'] as PriceMap;
    const count = (files['meta.json'] as StoreMeta).funnel!.gates[5].passing;
    expect(count).toBe(3);
    expect(rows.filter(r => r.b).map(r => r.id).sort()).toEqual(['BOUNDARY.US', 'BUY.US', 'SEED.US']);
    expect(rows.filter(r => r.b)).toHaveLength(count);
    expect(buyCount(rows, prices)).toBe(count);
    expect(() => assertIndexConsistency({ meta: files['meta.json'] as StoreMeta, rows: rows.map(r => ({ ...r, b: false })) })).toThrow(/buy|price/i);
  });
  it('renders the published decision even if a newer quote crosses the line', () => {
    const files = snapshot(), rows = files['index/default.json'] as IndexRow[];
    const prices = files['prices/US.json'] as PriceMap;
    prices['BUY.US'] = [110, '2026-09-30'];
    expect(buyCount(rows, prices)).toBe(3);
  });
  it('never invents buy decisions for legacy rows without b', () => {
    const files = snapshot();
    expect(buyCount((files['index/default.json'] as IndexRow[]).map(({ b: _b, ...r }) => r), files['prices/US.json'] as PriceMap)).toBe(0);
  });
});

it('refreshes the published flags and funnel in the same price snapshot', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { refreshPrices, commitPrices } = await import('@/scripts/value/stages/prices');
  const repo = mkdtempSync(path.join(tmpdir(), 'value-buy-refresh-'));
  try {
    for (const [file, data] of Object.entries(snapshot())) {
      mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
      writeFileSync(path.join(repo, file), JSON.stringify(data));
    }
    const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init', '-b', 'main'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.com'); git('add', '.'); git('commit', '-m', 'snapshot');
    await refreshPrices({ repo, companies: [company('BUY.US').company], now: Date.parse('2026-10-01T00:00:00Z'), bulk: async () => [{ code: base.company.code, close: 110, date: '2026-09-30' }] });
    const rows = JSON.parse(readFileSync(path.join(repo, 'index/default.json'), 'utf8')) as IndexRow[];
    const prices = JSON.parse(readFileSync(path.join(repo, 'prices/US.json'), 'utf8')) as PriceMap;
    const meta = JSON.parse(readFileSync(path.join(repo, 'meta.json'), 'utf8')) as StoreMeta;
    expect(prices['BUY.US'][0]).toBe(110);
    expect(meta.funnel!.gates[5].passing).toBe(2);
    expect(meta.story).toMatchObject({analysed:8,qualityPasses:7,qualityShare:7/8,atBuy:2,countriesCovered:1});
    expect(meta.western?.story).toMatchObject({analysed:8,qualityPasses:7,atBuy:2});
    expect(meta.western?.funnel.byCountry.US.gates[5].passing).toBe(2);
    expect(rows.filter(r => r.b)).toHaveLength(2);
    expect(buyCount(rows, prices)).toBe(2);
    expect(meta.funnel!.byCountry.US.gates[5].passing).toBe(2);
    expect(() => assertIndexConsistency({ rows, meta })).not.toThrow();
    expect(commitPrices({ repo, asOf: '2026-09-30' })).toBe(true);
    expect(git('status', '--porcelain')).toBe('');
    expect(JSON.parse(git('show', 'HEAD:index/default.json')).filter((r: IndexRow) => r.b)).toHaveLength(2);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

it('holds a newly implausible quote for review during a price refresh', async () => {
  const { publishedBuyPrice } = await import('@/lib/value/buy-price');
  const row = (snapshot()['index/default.json'] as IndexRow[]).find(r => r.id === 'BUY.US')!;
  expect(publishedBuyPrice(row, [10, '2026-09-30']).b).toBe(false);
});

it('uses the same cash flows for the return hurdle and buy price across publication and refresh', async () => {
  const { publishedBuyPrice } = await import('@/lib/value/buy-price');
  const a = company('TGHN.XETRA');
  a.company.currency = 'EUR';
  a.valuation = { ...a.valuation!, currency: 'EUR', shares: 100, normalized: 2622,
    growth: 0, discountRate: .1, netCash:17624.48, perShare: {low:350,mid:438.4448,high:500} };
  a.requiredMos = .35;
  const files = buildOutput({analyses:[a],prices:{[a.id]:[276,'2026-09-29']},holdersByTicker:{},investorNames:{},fx:{EUR:1.17}}).files;
  const row = (files['index/default.json'] as IndexRow[])[0];
  expect(row.b).toBe(true); // The old 9.5% shortcut omitted excess cash; IRR clears 10%.
  expect((files['meta.json'] as StoreMeta).story?.atBuy).toBe(1);
  expect(publishedBuyPrice(row,[262.2,'2026-09-30']).b).toBe(true); // Surplus cash is included in the same cash flows
  expect(publishedBuyPrice(row,[280,'2026-09-30']).b).toBe(true);
  expect(publishedBuyPrice(row,[300,'2026-09-30']).b).toBe(false);
});

it('fails closed when expected return is missing or nonfinite', async () => {
  const { publishedBuyPrice } = await import('@/lib/value/buy-price');
  const row = (snapshot()['index/default.json'] as IndexRow[]).find(r => r.id === 'BUY.US')!;
  expect(publishedBuyPrice({...row,buyReturnInputs:null},[60,'2026-09-30']).b).toBe(false);
  expect(publishedBuyPrice({...row,buyReturnInputs:{cashPerShare:NaN,growth:0,requiredReturn:.1}},[60,'2026-09-30']).b).toBe(false);
});
