import { describe, expect, it } from 'vitest';
import { dossierQualityPass, failedGates, fairBuyEligible, gateCode, profitRecord, qualityPass } from '@/lib/value/fair-buy';
import { publishedBuyPrice } from '@/lib/value/buy-price';
import { makeYears } from './synthetic';
import type { Year } from '@/lib/value/types';

const years = (overrides: (y: Year, i: number) => Partial<Year> = () => ({})) => makeYears({}).map((y, i) => ({ ...y, ...overrides(y, i) }));

describe('3.8.0 profit record (best-1 eligibility)', () => {
  it('passes a profitable record and reports its inputs', () => {
    const r = profitRecord({ years: years(), kind: 'operating' });
    expect(r.pass).toBe(true);
    expect(r.lossYears).toBe(0);
    expect(r.netIncomeYears).toBe(10);
    expect(r.ownerEarningsPerShare).toBeGreaterThan(0);
    expect(r.reasons).toEqual([]);
  });
  it('allows two loss years in ten but not three', () => {
    const last = years().at(-1)!.fy;
    const losses = (n: number) => years(y => y.fy > last - 9 && y.fy <= last - 9 + n ? { netIncome: -1 } : {});
    expect(profitRecord({ years: losses(2), kind: 'operating' }).pass).toBe(true);
    const three = profitRecord({ years: losses(3), kind: 'operating' });
    expect(three.pass).toBe(false);
    expect(three.reasons[0]).toMatch(/3 loss years/);
  });
  it('requires five observed years of net income and of operating margin', () => {
    const last = years().at(-1)!.fy;
    expect(profitRecord({ years: years(y => y.fy <= last - 5 ? { netIncome: null } : {}), kind: 'operating' }).pass).toBe(true);
    expect(profitRecord({ years: years(y => y.fy <= last - 4 ? { netIncome: null } : {}), kind: 'operating' }).pass).toBe(false);
    expect(profitRecord({ years: years(y => y.fy <= last - 4 ? { operatingIncome: null } : {}), kind: 'operating' }).pass).toBe(false);
  });
  it('fails a negative mean operating margin outside banks and insurers only', () => {
    const negative = years(y => ({ operatingIncome: -Math.abs(y.revenue ?? 1) * .05 }));
    expect(profitRecord({ years: negative, kind: 'operating' }).reasons.join(' ')).toMatch(/operating margin/);
    expect(profitRecord({ years: negative, kind: 'bank' }).reasons.join(' ')).not.toMatch(/operating margin/);
  });
  it('needs positive three-year average owner earnings per share (two of three years observed)', () => {
    const last = years().at(-1)!.fy;
    const missing = profitRecord({ years: years(y => y.fy >= last - 1 ? { dilutedShares: null } : {}), kind: 'operating' });
    expect(missing.ownerEarningsPerShare).toBeNull();
    expect(missing.pass).toBe(false);
    const banks = profitRecord({ years: years(y => y.fy >= last - 2 ? { commonNetIncome: -5, netIncome: 10 } : {}), kind: 'bank' });
    expect(banks.ownerEarningsPerShare).toBeLessThan(0);
    expect(banks.pass).toBe(false);
  });
  it('uses only the last ten fiscal years', () => {
    const all = years(), first = all[0].fy;
    expect(all).toHaveLength(11);
    const r = profitRecord({ years: years(y => y.fy <= first + 2 ? { netIncome: -1 } : {}), kind: 'operating' });
    expect(r).toMatchObject({ fy: all.at(-1)!.fy, lossYears: 2, netIncomeYears: 10, pass: true });
  });
});

describe('3.8.0 Buy quality and price', () => {
  const record = { pass: true };
  it('requires moat, economics, management and accounting plus the profit record; earnings resilience is evidence', () => {
    expect(fairBuyEligible('FPPPP', record)).toBe(true);
    expect(fairBuyEligible('PFPPP', record)).toBe(false);
    expect(fairBuyEligible('PPPPP', { pass: false })).toBe(false);
    expect(fairBuyEligible('PPPPP', null)).toBe(false);
    expect(fairBuyEligible('PPPCP', record)).toBe(false);
  });
  it('orders gates as moat, economics, management, accounting, profit record; legacy rows keep all five', () => {
    expect(gateCode({ t: 'FPPPP', pr: 'P' })).toBe('PPPPP');
    expect(gateCode({ t: 'PPPPP', pr: 'F' })).toBe('PPPPF');
    expect(qualityPass({ t: 'FPPPP', pr: 'P' })).toBe(true);
    expect(qualityPass({ t: 'FPPPP' })).toBe(false);
    expect(qualityPass({ t: 'PPPPP' })).toBe(true);
    expect(gateCode({ t: 'FPPPP' })).toBe('PPPPF');
  });
  it('buys at or below the central value with no discount and no return hurdle', () => {
    const row = { st: 's' as const, t: 'FPPPP', pr: 'P' as const, v: [80, 100, 120] as [number, number, number], shareSources: 2 as const };
    expect(publishedBuyPrice(row, [100, '2026-10-12']).b).toBe(true);
    expect(publishedBuyPrice(row, [99.99, '2026-10-12']).b).toBe(true);
    expect(publishedBuyPrice(row, [100.01, '2026-10-12'])).toMatchObject({ b: false, result: 'fail' });
    expect(publishedBuyPrice({ ...row, pr: 'F' }, [60, '2026-10-12']).b).toBe(false);
    expect(publishedBuyPrice({ ...row, businessChanged: true }, [60, '2026-10-12']).b).toBe(false);
    expect(publishedBuyPrice({ ...row, st: 'i' }, [60, '2026-10-12']).b).toBe(false);
    expect(publishedBuyPrice({ ...row, dataQualityFlags: ['Unverified share count'] }, [60, '2026-10-12']).b).toBe(false);
  });
  it('judges a dossier on the same gates', () => {
    const tests = Object.fromEntries(['understandable', 'moat', 'economics', 'management', 'accounting'].map(k => [k, { result: k === 'understandable' ? 'fail' : 'pass' }]));
    expect(dossierQualityPass({ tests, profitRecord: { pass: true } })).toBe(true);
    expect(dossierQualityPass({ tests })).toBe(false);
    expect(failedGates({ tests, profitRecord: { pass: false } })).toEqual(['record']);
    expect(failedGates({ tests })).toEqual(['understandable']);
  });
});
