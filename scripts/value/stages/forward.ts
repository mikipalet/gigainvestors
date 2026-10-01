import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildForwardSnapshot, computeForwardRecord, validForwardDate, type ForwardSnapshot, type TotalReturnLevel } from '../../../lib/value/forward';
import { readCorpusJson } from '../../../lib/value/corpus';
import { METHOD_VERSION } from '../../../lib/value/method-version';
import type { Company, Fundamentals, IndexRow, PriceMap, StoreMeta } from '../../../lib/value/types';

/** Reads only dated immutable records. No reconstruction from historical analysis. */
export function forwardFiles(repo: string, files: Record<string, unknown>, universe: Company[], prices: PriceMap, date: string): void {
  const directory=path.join(repo,'forward');
  const snapshots:ForwardSnapshot[]=existsSync(directory) ? readdirSync(directory).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map(file=>{
    const snapshot=JSON.parse(readFileSync(path.join(directory,file),'utf8')) as ForwardSnapshot;
    if (!validForwardDate(snapshot.date) || file!==`${snapshot.date}.json` || snapshot.date>date) throw new Error(`Invalid forward record ${file}`);
    return snapshot;
  }) : [];
  const previous=snapshots.filter(s=>s.date<date);
  const rows=Object.entries(files).filter(([file])=>/^index\/[A-Z]{2}\.json$/.test(file)).flatMap(([,rows])=>rows as IndexRow[]);
  const ids=new Set([...universe.map(c=>c.id),...previous.flatMap(s=>Object.keys(s.observations))]);
  const splitFactors:Record<string,number>={},totalReturns:Record<string,TotalReturnLevel>={};
  const companies=new Map(universe.map(c=>[c.id,c]));
  const prior=previous.at(-1)?.observations??{};
  // Optional cache contract: fixed-basis, dividend-reinvested index levels for this
  // exact close/date/currency. Annual financial-statement dividends are not prices.
  const levels=readCorpusJson<Record<string,TotalReturnLevel & {priceDate:string;currency:string}>>(`forward-total-return/${date}.json`)??{};
  for (const id of ids) {
    const fundamentals=readCorpusJson<Fundamentals>(`fundamentals/${id}.json`);
    // Providers can expose only their latest split. Keep the recorded share basis
    // and apply new actions after its quote, rather than recomputing old history.
    const from=prior[id]?.priceDate;
    splitFactors[id]=(fundamentals?.splits??[]).filter(s=>from && s.date>from && s.date<=prices[id]?.[1])
      .reduce((factor,s)=>factor*s.factor,prior[id]?.splitFactor??1);
    const currency=companies.get(id)?.currency??prior[id]?.currency;
    if(levels[id]?.priceDate===prices[id]?.[1] && levels[id]?.currency===currency) totalReturns[id]={value:levels[id].value,basis:levels[id].basis};
  }
  const snapshot=buildForwardSnapshot({date,universe,rows,prices,previous,splitFactors,totalReturns});
  files[`forward/${date}.json`]=snapshot;
  // The manifest and summary are derived and may be rebuilt. Dated files may not.
  const complete=[...previous,snapshot];
  files['forward/index.json']={dates:complete.map(s=>s.date)};
  const meta=files['meta.json'] as StoreMeta;
  meta.methodVersion=METHOD_VERSION;
  const {picks: _picks, ...summary}=computeForwardRecord(complete);
  meta.forward=summary;
}
