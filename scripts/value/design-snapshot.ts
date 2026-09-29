/** Freeze the published snapshot for design QA; never reanalyse or merge local quotes. */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { corpusPath } from '../../lib/value/corpus';
import { assertIndexConsistency } from '../../lib/value/consistency';
import type { IndexRow, StoreMeta } from '../../lib/value/types';

const out = process.argv[2];
if (!out?.startsWith('/tmp/')) throw new Error('Supply an isolated /tmp output directory');
const source = corpusPath('publish-repo');
const git = (...args: string[]) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
if (git('status', '--porcelain')) throw new Error('Published snapshot has local changes; wait for publication to finish');
mkdirSync(out, { recursive: true });
if (readdirSync(out).length) throw new Error('Use an empty output directory for a frozen snapshot');
for (const file of ['index', 'prices', 'dossiers', 'search', 'meta.json', 'top.json']) {
  cpSync(path.join(source, file), path.join(out, file), { recursive: true });
}
if (git('rev-parse', 'HEAD') !== commit || git('status', '--porcelain')) throw new Error('Published snapshot changed during copy; retry after publication');
const meta = JSON.parse(readFileSync(path.join(out, 'meta.json'), 'utf8')) as StoreMeta;
const rows = JSON.parse(readFileSync(path.join(out, 'index/default.json'), 'utf8')) as IndexRow[];
assertIndexConsistency({ meta, rows });
writeFileSync(path.join(out, 'qa-provenance.json'), JSON.stringify({ at: new Date().toISOString(), source, commit, originalAsOf: meta.asOf, providerCalls: 0, mode: 'published-copy' }, null, 2));
console.log(JSON.stringify({ commit, meta }, null, 2));
