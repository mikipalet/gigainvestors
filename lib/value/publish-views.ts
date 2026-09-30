import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { browserRow, historyView, packView, type ViewManifest } from './browser-view';
import type { Dossier, IndexRow, PriceMap, SnapshotRow, StoreMeta } from './types';

export function publishViews(files: Record<string, unknown>): ViewManifest {
  const prices: PriceMap = Object.assign({}, ...Object.entries(files).filter(([f])=>/^prices\//.test(f)).map(([,data])=>data));
  const dossiers: Record<string,Dossier> = Object.assign({}, ...Object.entries(files).filter(([f])=>/^dossiers\//.test(f)).map(([,data])=>data));
  const save = (data: unknown) => {
    const text = JSON.stringify(data);
    const file = `views/${createHash('sha256').update(text).digest('hex').slice(0,24)}.json`;
    files[file] = data;
    return file;
  };
  // Country filters also show companies with insufficient data. Keep those
  // identities in the deferred current view, without adding them to first paint.
  const missing=Object.entries(files).filter(([f])=>/^index\/[A-Z]{2}\.json$/.test(f))
    .flatMap(([,data])=>(data as IndexRow[]).filter(row=>row.st==='i'));
  const source=[...new Map([...(files['index/default.json'] as IndexRow[] ?? []),...missing].map(row=>[row.id,row])).values()];
  const rows=source.map(row => {
    const d=dossiers[row.id];
    return browserRow({...row,...(row.b && d?.valuation ? {ownerReturnInputs:{valuation:d.valuation,marketCapUsd:d.company.marketCapUsd}} : {})}, prices[row.id]??null);
  });
  const manifest: ViewManifest = {current:save(packView(rows)),years:{}};
  const identities=(files['history/companies.json'] as IndexRow[] | undefined)??Object.entries(files).filter(([f])=>/^index\/[A-Z]{2}\.json$/.test(f)).flatMap(([,data])=>data as IndexRow[]);
  for (const [file,data] of Object.entries(files)) {
    const year=/^history\/(\d{4})\.json$/.exec(file)?.[1];
    if (!year) continue;
    const view=packView(historyView(data as SnapshotRow[],identities));
    const bytes=gzipSync(JSON.stringify(view)).byteLength;
    if(bytes>60_000) throw new Error(`Year ${year} exceeds browser budget: ${bytes} compressed bytes`);
    manifest.years[year]=save(view);
  }
  (files['meta.json'] as StoreMeta).views=manifest;
  return manifest;
}
