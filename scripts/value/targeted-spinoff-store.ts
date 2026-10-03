/** One-off, fail-closed overlay for the reviewed spin-off cohort. Never publishes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync, statfsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildOutput } from '../../lib/value/build-output';
import { browserRow, packView } from '../../lib/value/browser-view';
import { qualityMetric } from '../../lib/value/quality-metric';
import { assertIndexConsistency } from '../../lib/value/consistency';
import { buildAdaptiveSearchShards } from '../../lib/value/search';
import { storyFromFunnel } from '../../lib/value/story';
import { shardOf } from '../../lib/value/shard';
import type { Dossier, FunnelCounts, IndexRow, PriceMap, PublishedFunnel, SearchShard, StoreMeta } from '../../lib/value/types';
import { mergeRows, mergeSearch } from './targeted-store-merge';

const [baseline, candidate, output, idsFile] = process.argv.slice(2).map(p => path.resolve(p));
assert(baseline && candidate && output && idsFile, 'Usage: tsx targeted-spinoff-store.ts BASELINE CANDIDATE OUTPUT IDS');
assert.equal(realpathSync(output), '/tmp/value-spinoff-store', 'Only the dedicated /tmp output is writable');
assert.notEqual(realpathSync(baseline), realpathSync(output));
const disk = () => { const d = statfsSync(output); assert(d.bavail * d.bsize >= 4 * 1024 ** 3, 'DISK STOP'); };
const read = <T>(root: string, f: string): T => JSON.parse(readFileSync(path.join(root, f), 'utf8'));
const ids = new Set(read<string[]>(path.dirname(idsFile), path.basename(idsFile)));
assert.equal(ids.size, 77, 'The original 77 include all ten predecessor companies');
const write = (f: string, value: unknown) => {
  disk();
  const filename = path.join(output, f);
  if (existsSync(filename) && JSON.stringify(read(output, f)) === JSON.stringify(value)) return;
  writeFileSync(filename, JSON.stringify(value) + '\n');
};
const countryFiles = readdirSync(path.join(baseline, 'index')).filter(f => /^[A-Z]{2}\.json$/.test(f));
const liveRows = countryFiles.flatMap(f => read<IndexRow[]>(baseline, `index/${f}`));
assert(!liveRows.some(r => ids.has(r.id)), 'This reviewed overlay expects direct-only target dossiers');
const sourceRows = countryFiles.flatMap(f => read<IndexRow[]>(candidate, `index/${f}`)).filter(r => ids.has(r.id));
assert.equal(sourceRows.length, ids.size);
const dossiers = new Map<string, Dossier>();
for (const id of ids) {
  const f = `dossiers/${shardOf(id)}.json`;
  const d = read<Record<string, Dossier>>(candidate, f)[id];
  assert.equal(d?.id, id);
  dossiers.set(id, d);
  const shard = read<Record<string, Dossier>>(output, f);
  assert(shard[id], `Expected existing direct dossier ${id}`);
  shard[id] = d;
  write(f, shard);
}
for (const f of readdirSync(path.join(baseline, 'index'))) {
  write(`index/${f}`, mergeRows(read<IndexRow[]>(baseline, `index/${f}`), read<IndexRow[]>(candidate, `index/${f}`), ids, row => row.id));
}

// Build ONLY these identities' tokens. Preserve live offsets, rows and aliases.
const search = buildAdaptiveSearchShards([...dossiers.values()].map(d => d.company), ids);
const liveManifest = read<typeof search.manifest>(baseline, 'search/manifest.json');
assert.deepEqual(search.manifest.split, [], 'A split requires a separately reviewed routing merge');
assert.deepEqual(liveManifest.split, []);
for (const [prefix, file] of Object.entries(search.manifest.localPrefixes ?? {})) {
  assert.equal(liveManifest.localPrefixes?.[prefix], file, `New local search routing requires review: ${prefix}`);
}
for (const [key, addition] of Object.entries(search.shards)) {
  if (!addition.rows.length) continue;
  const f = `search/${key}.json`;
  assert(existsSync(path.join(output, f)), `Missing live search shard ${key}`);
  const merged = mergeSearch(read<SearchShard>(baseline, f), addition, ids);
  assert(Buffer.byteLength(JSON.stringify(merged) + '\n') <= 60_000, `Search budget exceeded: ${key}`);
  write(f, merged);
}
// Manifest routing already covers every new token. Its bytes remain unchanged.

// No reviewed historical snapshots exist for this cohort. Fail rather than
// silently discarding history if a different candidate is supplied later.
for (const root of [baseline, candidate]) for (const f of readdirSync(path.join(root, 'history'))) {
  const data = read<unknown>(root, `history/${f}`);
  if (Array.isArray(data)) assert(!data.some(r => ids.has(Array.isArray(r) ? r[0] : r.id)), `Unexpected target history: ${root}/${f}`);
}

const prices = Object.assign({}, ...readdirSync(path.join(baseline, 'prices')).map(f => read<PriceMap>(baseline, `prices/${f}`))) as PriceMap;
const meta = read<StoreMeta>(baseline, 'meta.json');
const { files: contribution } = buildOutput({ analyses: [...dossiers.values()], holdersByTicker: {}, investorNames: {}, fx: {}, prices });
const contributionRows = Object.entries(contribution).filter(([f]) => /^index\/[A-Z]{2}\.json$/.test(f)).flatMap(([, v]) => v as IndexRow[]);
assert.equal(contributionRows.length, ids.size);
for (const row of sourceRows) {
  const derived = contributionRows.find(r => r.id === row.id)!;
  assert.deepEqual([derived.t, derived.b, derived.st], [row.t, row.b, row.st], `Aggregate inputs disagree for ${row.id}`);
  assert.equal(row.b, false);
  assert.notEqual(row.t, 'PPPPP');
  assert(!/^P*FP*$/.test(row.t), `Unexpected investment-list entry ${row.id}`);
}
const delta = contribution['meta.json'] as StoreMeta;
const addCounts = (live: FunnelCounts, added: FunnelCounts) => {
  live.analysed += added.analysed;
  for (let i = 0; i < live.gates.length; i++) for (const key of ['passing', 'pass', 'fail', 'checking', 'unclear', 'failsOnlyThis'] as const) {
    assert.equal(live.gates[i].key, added.gates[i].key);
    live.gates[i][key] = (live.gates[i][key] ?? 0) + (added.gates[i][key] ?? 0);
  }
};
const addFunnel = (live: PublishedFunnel, added: PublishedFunnel) => {
  addCounts(live, added);
  for (const [country, counts] of Object.entries(added.byCountry)) {
    assert(live.byCountry[country], `New country requires review: ${country}`);
    addCounts(live.byCountry[country], counts);
  }
};
assert(meta.funnel && delta.funnel && meta.western && delta.western && meta.views);
addFunnel(meta.funnel, delta.funnel);
addFunnel(meta.western.funnel, delta.western.funnel);
meta.story = storyFromFunnel(meta.funnel);
meta.western.story = storyFromFunnel(meta.western.funnel);
for (const key of ['analysed', 'scored', 'insufficient'] as const) meta.counts[key] = (meta.counts[key] ?? 0) + (delta.counts[key] ?? 0);

// Keep every live view byte-identical; append one isolated deferred payload.
const rows = sourceRows.map(row => {
  const d = dossiers.get(row.id)!;
  return browserRow({ ...row, quality: qualityMetric(d.company.kind, d.tests.moat.metrics), ...(d.valuation ? { ownerReturnInputs: { valuation: d.valuation, marketCapUsd: d.company.marketCapUsd } } : {}) }, prices[row.id] ?? null);
});
const payload = packView(rows);
const viewFile = `views/${createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24)}.json`;
assert(!existsSync(path.join(output, viewFile)), 'Overlay already applied');
write(viewFile, payload);
meta.views.deferred = [...(meta.views.deferred ?? []), viewFile];
assertIndexConsistency({ meta, rows: read(output, 'index/default.json') });
write('meta.json', meta);
console.log(JSON.stringify({ targets: ids.size, predecessors: [...dossiers.values()].filter(d => d.predecessorHistory?.length).length, counts: meta.counts, viewFile, historyChanges: 0, manifestChanges: 0 }));
