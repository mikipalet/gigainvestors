import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { retainPublicationObservations } from '@/scripts/value/publication-continuity';
import type { IndexRow } from '@/lib/value/types';

afterEach(() => vi.unstubAllEnvs());
const row = (over: Partial<IndexRow>): IndexRow => ({ id: 'A.US', n: 'A', c: 'US', s: null, k: 'operating', mc: null, v: [80, 100, 120], cur: 'USD', t: 'FPPPP', g: [], h: 0, st: 's', w: 'A.US', b: false, m: .35, methodVersion: '3.7.1', ...over });

it('logs every published verdict change with its cause, attributing the 3.8.0 Buy rule to the method', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'attribution-'));
  vi.stubEnv('VALUE_CORPUS_DIR', dir);
  const before = { 'index/US.json': [row({}), row({ id: 'B.US', t: 'PPPPP', pr: 'P', m: 0, methodVersion: '3.8.0', b: true })] };
  const files = { 'index/US.json': [row({ pr: 'P', m: 0, b: true, methodVersion: '3.8.0' }), row({ id: 'B.US', t: 'PPPPP', pr: 'F', m: 0, methodVersion: '3.8.0', b: false })] };
  retainPublicationObservations(files, { ids: new Set(), previous: before, dossiers: {}, reasons: {} }, {});
  const log = JSON.parse(readFileSync(path.join(dir, 'staging/verdict-changes.json'), 'utf8'));
  expect(log.map((t: { id: string; attribution: string }) => [t.id, t.attribution])).toEqual([['A.US', 'buy-rule-method'], ['B.US', 'profit-record-inputs']]);
  expect(log[0]).toMatchObject({ before: { b: false, m: .35, methodVersion: '3.7.1' }, after: { b: true, pr: 'P', m: 0, methodVersion: '3.8.0' } });
});

it('retains no prior observations for a dossier whose statement currency was corrected (3.8.2)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'currency-retention-'));
  vi.stubEnv('VALUE_CORPUS_DIR', dir);
  const dossier = (over: Record<string, unknown>) => ({ id: 'A.US', asOf: '2026-10-12', reportingCurrency: 'USD', tests: {}, series: { revenuePerShare: [[2024, 10], [2025, 50]] }, ...over });
  const before = { 'index/US.json': [row({})], 'dossiers/000.json': { 'A.US': dossier({}) } };
  const corrected = dossier({ reportingCurrency: 'BRL', series: { revenuePerShare: [[2024, 10]] } });
  const files: Record<string, any> = { 'index/US.json': [row({})], 'dossiers/000.json': { 'A.US': corrected } };
  retainPublicationObservations(files, { ids: new Set(), previous: before, dossiers: {}, reasons: {} }, {});
  expect(files['dossiers/000.json']['A.US'].series.revenuePerShare).toEqual([[2024, 10]]);
  const dropped = dossier({ series: { revenuePerShare: [[2024, 10]] }, events: [{ fy: 2025, kind: 'currency_change', note: 'Statement currency changed in 2025: FY2025 mixes currencies under one USD label (ocf = filing ARS)' }] });
  const again: Record<string, any> = { 'index/US.json': [row({})], 'dossiers/000.json': { 'A.US': dropped } };
  retainPublicationObservations(again, { ids: new Set(), previous: before, dossiers: {}, reasons: {} }, {});
  expect(again['dossiers/000.json']['A.US'].series.revenuePerShare).toEqual([[2024, 10]]);
  expect(JSON.parse(readFileSync(path.join(dir, 'staging/retained-published-numbers.json'), 'utf8'))[0]).toMatchObject({ id: 'A.US', retained: [], reason: 'statement currency corrected' });
  // Control: the same omission without a currency correction is retained as before.
  const plain: Record<string, any> = { 'index/US.json': [row({})], 'dossiers/000.json': { 'A.US': dossier({ series: { revenuePerShare: [[2024, 10]] } }) } };
  retainPublicationObservations(plain, { ids: new Set(), previous: before, dossiers: {}, reasons: {} }, {});
  expect(plain['dossiers/000.json']['A.US'].series.revenuePerShare).toEqual([[2024, 10], [2025, 50]]);
});
