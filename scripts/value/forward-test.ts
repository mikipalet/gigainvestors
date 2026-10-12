/** Method 3.8.0 forward test (not shown on the site).
 *   freeze --repo=<published repo> --out=<file> [--date=YYYY-MM-DD] [--baseline=<live archive commit>]
 *       Write the published Buy list once. Refuses to overwrite an existing file.
 *   verify --repo=<published repo> --snapshot=<file>
 *       Exit 1 unless the published Buy ids equal the frozen list (controller check at release).
 *   score [--repo=<published repo>] [--snapshots=<dir>]
 *       Equal-weight return of each frozen list since its date vs SPY and EFA. Appends one
 *       JSON line per list to <corpus>/forward-test/scores.jsonl and prints a summary.
 *       Quotes: the published price files the nightly writes; splits: cached fundamentals;
 *       benchmarks: Yahoo daily closes (no EODHD). Non-fatal in run-daily.sh. */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { corpusPath, readCorpusJson } from '../../lib/value/corpus';
import { buyListSnapshot, scoreForwardTest, type ForwardTestSnapshot, type Series } from '../../lib/value/forward-test';
import { METHOD_VERSION } from '../../lib/value/method-version';
import { readPrices } from '../../lib/value/price-files';
import type { Fundamentals, IndexRow, StoreMeta } from '../../lib/value/types';

const args = Object.fromEntries(process.argv.slice(3).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=')]; }));
const command = process.argv[2];
const SNAPSHOTS = path.resolve('docs/value/forward-test'); // run from the repository root, as run-daily.sh does

function published(repo: string) {
  const rows = readdirSync(path.join(repo, 'index')).filter(f => /^[A-Z]{2}\.json$/.test(f))
    .flatMap(f => JSON.parse(readFileSync(path.join(repo, 'index', f), 'utf8')) as IndexRow[]);
  const meta = JSON.parse(readFileSync(path.join(repo, 'meta.json'), 'utf8')) as StoreMeta;
  let commit: string | null = null;
  // Only the published repository's own commit; never a parent checkout's.
  if (existsSync(path.join(repo, '.git'))) try { commit = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { commit = null; }
  return { rows, prices: readPrices(path.join(repo, 'prices')), meta, commit };
}

async function yahooDaily(symbol: string): Promise<Series> {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Yahoo ${symbol}: HTTP ${response.status}`);
  const result = (await response.json())?.chart?.result?.[0];
  const times: number[] = result?.timestamp ?? [], closes: Array<number | null> = result?.indicators?.quote?.[0]?.close ?? [];
  return times.flatMap((t, i) => typeof closes[i] === 'number' && closes[i]! > 0 ? [[new Date(t * 1000).toISOString().slice(0, 10), closes[i]!] as [string, number]] : []);
}

async function main() {
  if (command === 'freeze') {
    const repo = args.repo, out = args.out;
    if (!repo || !out) throw new Error('freeze needs --repo and --out');
    const { rows, prices, meta, commit } = published(repo);
    const snapshot = buyListSnapshot({ date: args.date ?? new Date().toISOString().slice(0, 10), rows, prices, methodVersion: METHOD_VERSION, publishCommit: commit, publishedAsOf: meta.asOf ?? null, ...(args.baseline ? { baselineCommit: args.baseline } : {}) });
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(snapshot, null, 1) + '\n', { flag: 'wx' }); // written once, never edited
    console.log(`forward-test: froze ${snapshot.companies.length} Buys (${snapshot.companies.filter(c => c.western).length} Western) at ${commit ?? 'unknown commit'} -> ${out}`);
    return;
  }
  if (command === 'verify') {
    const { rows } = published(args.repo);
    const snapshot = JSON.parse(readFileSync(args.snapshot, 'utf8')) as ForwardTestSnapshot;
    const live = rows.filter(r => r.b === true).map(r => r.id).sort(), frozen = snapshot.companies.map(c => c.id).sort();
    const added = live.filter(id => !frozen.includes(id)), removed = frozen.filter(id => !live.includes(id));
    console.log(JSON.stringify({ frozen: frozen.length, live: live.length, added, removed }));
    if (added.length || removed.length) process.exit(1);
    return;
  }
  if (command === 'score') {
    const repo = args.repo ?? corpusPath('publish-repo'), dir = args.snapshots ?? SNAPSHOTS;
    const files = existsSync(dir) ? readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}-buy-list\.json$/.test(f)).sort() : [];
    if (!files.length) { console.log('forward-test: no frozen buy list'); return; }
    const prices = readPrices(path.join(repo, 'prices'));
    const benchmarks: Record<string, Series> = {};
    for (const symbol of ['SPY', 'EFA']) {
      try { benchmarks[symbol] = await yahooDaily(symbol); } catch (error) { console.warn(`forward-test: benchmark ${symbol} unavailable: ${error instanceof Error ? error.message : error}`); }
    }
    const asOf = new Date().toISOString().slice(0, 10);
    mkdirSync(corpusPath('forward-test'), { recursive: true });
    for (const file of files) {
      const snapshot = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as ForwardTestSnapshot;
      const splitFactors = Object.fromEntries(snapshot.companies.map(c => {
        const splits = readCorpusJson<Fundamentals>(`fundamentals/${c.id}.json`)?.splits ?? [];
        return [c.id, splits.filter(s => s.date > c.priceDate && s.date <= (prices[c.id]?.[1] ?? '')).reduce((f, s) => f * s.factor, 1)];
      }));
      const score = { file, ...scoreForwardTest({ snapshot, prices, splitFactors, benchmarks, asOf }) };
      appendFileSync(corpusPath('forward-test', 'scores.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...score }) + '\n');
      const pct = (n: number | null | undefined) => n == null ? 'n/a' : `${(n * 100).toFixed(2)}%`;
      console.log(`forward-test: ${file} ${score.companies} names since ${snapshot.date}: basket ${pct(score.basketReturn)} (Western ${pct(score.westernBasketReturn)}), SPY ${pct(score.benchmarks.SPY?.return)}, EFA ${pct(score.benchmarks.EFA?.return)}; stale quotes ${score.staleQuotes.length}`);
    }
    return;
  }
  throw new Error('Usage: forward-test.ts freeze|verify|score');
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
