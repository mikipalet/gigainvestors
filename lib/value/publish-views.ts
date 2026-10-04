import { qualityMetric } from './quality-metric';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { browserRow,historyView,packView,type BrowserRow,type ViewManifest } from './browser-view';
import type { Dossier,IndexRow,PriceMap,SnapshotRow,StoreMeta } from './types';

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
    .flatMap(([,data])=>(data as IndexRow[]).filter(row=>row.st==='i'||dossiers[row.id]?.predecessorHistory?.length));
  const source=[...new Map([...(files['index/default.json'] as IndexRow[] ?? []),...missing].map(row=>[row.id,row])).values()];
  const rows=source.map(row => {
    const d=dossiers[row.id];
    return browserRow({...row,...(d?{quality:qualityMetric(d.company.kind,d.tests.moat.metrics)}:{}),...(d?.valuation ? {ownerReturnInputs:{valuation:d.valuation,marketCapUsd:d.company.marketCapUsd}} : {})}, prices[row.id]??null);
  });
  const bounded=(rows:BrowserRow[],limit=80_000)=>{
    const payload=packView(rows);
    if(gzipSync(JSON.stringify(payload)).byteLength>limit)throw new Error(`Automatic browser view exceeds ${limit} bytes compressed`);
    return save(payload);
  };
  const chunks=(rows:BrowserRow[]):string[]=>{
    if(!rows.length)return [];
    const payload=packView(rows);
    if(gzipSync(JSON.stringify(payload)).byteLength<=75_000)return [save(payload)];
    if(rows.length===1)throw new Error('Single browser row exceeds 75KB');
    const mid=Math.ceil(rows.length/2);
    return [...chunks(rows.slice(0,mid)),...chunks(rows.slice(mid))];
  };
  // Partial writers (notably prices) supply no history. Omission must not
  // retract released frames; supplied periods below replace both view halves.
  const prior = (files['meta.json'] as StoreMeta).views;
  const manifest: ViewManifest = {current:bounded(rows.filter(r=>r.t==='PPPPP')),deferred:chunks(rows.filter(r=>r.t!=='PPPPP')),
    years:{...prior?.years},yearDeferred:{...prior?.yearDeferred},quarters:{...prior?.quarters},quarterDeferred:{...prior?.quarterDeferred}};
  const currentById=new Map(source.map(row=>[row.id,row]));
  const identities=((files['history/companies.json'] as IndexRow[] | undefined)??Object.entries(files).filter(([f])=>/^index\/[A-Z]{2}\.json$/.test(f)).flatMap(([,data])=>data as IndexRow[])).map(row=>({...row,lg:currentById.get(row.id)?.lg??row.lg}));
  for (const [file,data] of Object.entries(files)) {
    const year=/^history\/(\d{4}(?:Q[1-4])?)\.json$/.exec(file)?.[1];
    if (!year) continue;
    const rows=historyView(data as SnapshotRow[],identities);
    if(year.includes('Q')){
      manifest.quarters![year]=bounded(rows.filter(r=>r.t==='PPPPP'),60_000);
      manifest.quarterDeferred![year]=chunks(rows.filter(r=>r.t!=='PPPPP'));
      if(year.endsWith('Q4')){manifest.years[year.slice(0,4)]=manifest.quarters![year];manifest.yearDeferred![year.slice(0,4)]=manifest.quarterDeferred![year];}
    }else{
      manifest.years[year]=bounded(rows.filter(r=>r.t==='PPPPP'));
      manifest.yearDeferred![year]=chunks(rows.filter(r=>r.t!=='PPPPP'));
    }
  }
  (files['meta.json'] as StoreMeta).views=manifest;
  return manifest;
}
