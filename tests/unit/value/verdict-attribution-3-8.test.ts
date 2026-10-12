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
