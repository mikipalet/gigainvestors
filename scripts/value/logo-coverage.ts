/** Read-only coverage audit. Prints JSON; never analyzes or publishes. */
import {readFileSync} from 'node:fs';
import {readCorpusJson} from '../../lib/value/corpus';
import {publishedLogoRows} from './stages/logos';
import {unpackView,type BrowserPayload} from '../../lib/value/browser-view';
import {mainCompanies,mainZones} from '../../lib/value/main-layout';
import type {IndexRow} from '../../lib/value/types';
const baseline=process.argv[2]?JSON.parse(readFileSync(process.argv[2],'utf8')):{rows:publishedLogoRows()};
const rows=baseline.rows as IndexRow[];
const metadata=readCorpusJson<{views:{current:string}}>('publish-repo/meta.json')!;
const view=unpackView(readCorpusJson<BrowserPayload>('publish-repo/'+metadata.views.current)!);
const cache=new Map(rows.map(r=>[r.id,readCorpusJson<{logo?:string;source?:string;sourceUrl?:string;asset?:string;validationVersion?:number;website?:string;retryable?:boolean;failures?:string[]}>(`enrichment-v7/logos/${r.id}.json`)]));
const covered=(id:string)=>Boolean(cache.get(id)?.validationVersion===2&&cache.get(id)?.logo);
const count=(ids:string[])=>({total:ids.length,before:ids.filter(id=>rows.find(r=>r.id===id)?.lg).length,after:ids.filter(covered).length,misses:ids.filter(id=>!covered(id))});
const homes=Object.fromEntries(['all','western',...new Set(rows.map(r=>r.c))].map(scope=>{
 const zones=mainZones(mainCompanies(view.filter(r=>scope==='all'||(scope==='western'?r.w:r.c===scope)).map(row=>({row,quote:row.quote?.[0]??null,expected:row.expected,mos:null}))));
 // Superset of named cards across current responsive rules: up to 5 buys + 8 columns x 5 next rows.
 const ids=[...new Set([...zones.buy.slice(0,5),...zones.next.slice(0,40)].map(c=>c.id))];
 return [scope,{...count(ids),ids,buy:count(zones.buy.map(c=>c.id)),next:count(zones.next.map(c=>c.id))}];
}));
const bySource=(before:boolean)=>Object.fromEntries([...new Set(rows.map(r=>before?(r.lg?.startsWith('https://eodhd.com/')?'eodhd':r.lg?.includes('duckduckgo.com')?'favicon':r.lg?'official-site':'missing'):(covered(r.id)?cache.get(r.id)?.source??'unknown':'missing')))].sort().map(source=>[source,rows.filter(r=>(before?(r.lg?.startsWith('https://eodhd.com/')?'eodhd':r.lg?.includes('duckduckgo.com')?'favicon':r.lg?'official-site':'missing'):(covered(r.id)?cache.get(r.id)?.source??'unknown':'missing'))===source).length]));
console.log(JSON.stringify({at:new Date().toISOString(),total:count(rows.map(r=>r.id)),sources:{before:bySource(true),after:bySource(false)},homes,quality:count(rows.filter(r=>r.t==='PPPPP').map(r=>r.id)),misses:rows.filter(r=>!covered(r.id)).map(r=>({id:r.id,name:r.n,country:r.c,before:!!r.lg,...cache.get(r.id)}))},null,2));
