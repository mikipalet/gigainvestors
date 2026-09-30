import { storyFromFunnel } from "./story";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { publicAnalysis } from './public-analysis';
import { publishViews } from './publish-views';
import path from 'node:path';
import { publishedBuyPrice } from './buy-price';
import { assertIndexConsistency } from './consistency';
import { readPrices } from './price-files';
import { shardOf } from './shard';
import type { Dossier, FunnelCounts, IndexRow, StoreMeta } from './types';

/** Run under the publish lock, before committing refreshed quotes. Never consult
 * local analyses: the decision belongs to the valuation in this published snapshot.
 */
export function refreshPublishedBuyPrices(repo: string): void {
  const index = path.join(repo, 'index'), metaFile = path.join(repo, 'meta.json');
  if (!existsSync(index) || !existsSync(metaFile)) return;
  const meta: StoreMeta = JSON.parse(readFileSync(metaFile, 'utf8'));
  if (!meta.funnel) return;
  const prices = readPrices(path.join(repo, 'prices'));
  const files: Record<string, unknown> = {};
  const decisions = new Map<string, ReturnType<typeof publishedBuyPrice>>();
  const updateGate = (population: FunnelCounts, rows: IndexRow[]) => {
    const gate = population.gates.find(g => g.key === 'price');
    if (!gate) throw new Error('Published price gate missing');
    const quality = rows.filter(r => r.st === 's' && r.t === 'PPPPP');
    gate.passing = gate.pass = quality.filter(r => r.b).length;
    gate.fail = gate.failsOnlyThis = quality.filter(r => {
      const p = decisions.get(r.id)!;
      return p.result === 'fail' || p.mos !== null && !p.b;
    }).length;
    gate.checking = 0;
    gate.unclear = quality.length - gate.passing - gate.fail;
  };
  const all: IndexRow[] = [];
  for (const file of readdirSync(index).filter(f => /^[A-Z]{2}\.json$/.test(f))) {
    const rows: IndexRow[] = JSON.parse(readFileSync(path.join(index, file), 'utf8'));
    for (const row of rows) {
      const decision = publishedBuyPrice(row, prices[row.id]);
      row.b = decision.b;
      delete row.dataQualityFlags;
      if(decision.dataQualityFlags.length){row.v=null;row.buyReturnInputs=null;}
      decisions.set(row.id, decision);
    }
    all.push(...rows);
    files[`index/${file}`] = rows;
    updateGate(meta.funnel.byCountry[file.slice(0, 2)], rows);
    const westernCountry = meta.western?.funnel.byCountry[file.slice(0, 2)];
    if (westernCountry) updateGate(westernCountry, rows.filter(row=>row.w!=null));
  }
  updateGate(meta.funnel, all);
  meta.story = storyFromFunnel(meta.funnel);
  if (meta.western) {
    updateGate(meta.western.funnel, all.filter(row=>row.w!=null));
    meta.western.story = storyFromFunnel(meta.western.funnel);
  }
  const defaultRows: IndexRow[] = JSON.parse(readFileSync(path.join(index, 'default.json'), 'utf8'));
  const byId = new Map(all.map(row => [row.id, row]));
  files['index/default.json'] = defaultRows.map(row => byId.get(row.id) ?? row);
  files['meta.json'] = meta;
  assertIndexConsistency({ meta, rows: files['index/default.json'] as IndexRow[] });
  // Keep dossier badges on the same published verdict too.
  for (const shard of new Set(all.map(row => shardOf(row.id)))) {
    const file = `dossiers/${shard}.json`;
    if (!existsSync(path.join(repo, file))) continue;
    const dossiers: Record<string, Dossier> = JSON.parse(readFileSync(path.join(repo, file), 'utf8'));
    for (const dossier of Object.values(dossiers)) {
      const p = decisions.get(dossier.id);
      if (!p) continue;
      dossier.b = p.b;
      dossier.dataQualityFlags = p.dataQualityFlags;
      dossier.tests.price = { key: 'price', result: p.result, numeric: p.result, reasons: p.mos === null ? ['Comparable price or valuation unavailable'] : [], metrics: { mos: p.mos }, series: {}, jev: [] };
      dossiers[dossier.id]=publicAnalysis(dossier);
    }
    files[file] = dossiers;
  }
  if(meta.views){
    const years=meta.views.years;
    for(const file of readdirSync(path.join(repo,'prices')).filter(f=>/^[A-Z]{2}\.json$/.test(f)))files[`prices/${file}`]=JSON.parse(readFileSync(path.join(repo,'prices',file),'utf8'));
    publishViews(files).years=years;
  }
  for (const [file, data] of Object.entries(files)) {
    const destination = path.join(repo, file), text = JSON.stringify(data) + '\n';
    if (existsSync(destination)&&readFileSync(destination, 'utf8') === text) continue;
    mkdirSync(path.dirname(destination),{recursive:true});
    writeFileSync(`${destination}.tmp`, text);
    renameSync(`${destination}.tmp`, destination);
  }
}
