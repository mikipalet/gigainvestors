import {schemaJson,datasetSchema} from '@/lib/agents/schema';
import {siteUrl} from '@/lib/agents/urls';
import { assertIndexConsistency } from '@/lib/value/consistency';
import { getDefaultIndex, getMeta, enrichRows, readStore } from '@/lib/value/store';
import { browserRow, unpackView, type BrowserPayload, type BrowserRow } from '@/lib/value/browser-view';
import type { HistoryIndex } from '@/lib/value/time-travel';
import type { PriceMap } from '@/lib/value/types';
import ValueIndex from './ValueIndex';
export async function renderValuePage(year?: string) {
  const [meta, history] = await Promise.all([getMeta(),readStore<HistoryIndex>('history/index.json')]);
  let rows: BrowserRow[];
  const file=year ? meta?.views?.quarters?.[year]??meta?.views?.quarters?.[`${year}Q4`]??meta?.views?.years[year]??(year.endsWith('Q4')?meta?.views?.years[year.slice(0,4)]:undefined) : meta?.views?.current;
  if (file) { const data=await readStore<BrowserPayload>(file); rows=data?unpackView(data):[]; }
  else {
    const source=await getDefaultIndex().then(enrichRows);
    assertIndexConsistency({meta,rows:source});
    const quotes=Object.assign({},...await Promise.all([...new Set(source.map(r=>r.c))].map(cc=>readStore<PriceMap>(`prices/${cc}.json`))));
    rows=source.map(row=>browserRow(row,quotes[row.id]??null));
  }
  const initialRows=meta?.views&&!year ? rows.filter(row=>row.t==='PPPPP') : rows;
  const todayPayload=year&&meta?.views?.current?await readStore<BrowserPayload>(meta.views.current):null;
  const todayRows=todayPayload?unpackView(todayPayload).filter(row=>row.t==='PPPPP'):undefined;
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:schemaJson(datasetSchema(year?`Historical checklist ${year}`:"Business quality checklist",siteUrl("value",year?`/?q=${year.includes("Q")?year:year+"Q4"}`:"/"),meta?.asOf))}} />
    <ValueIndex todayRows={todayRows} rows={initialRows} initialFilter={year?year.includes('Q')?{q:year}:{year}:{}} tags={meta?.tags??{}} meta={meta} initialHistory={history} /></>;
}
