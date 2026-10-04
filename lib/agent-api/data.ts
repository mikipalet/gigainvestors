import {METHOD_SECTIONS} from '@/lib/value/method-content';
import {VALUE_PRODUCT_NAME} from '@/lib/value/brand';
import {z} from 'zod';
import {getIndex,getInvestor,getSearchIndex,getStock} from '@/lib/data';
import {getMeta,getDefaultIndex,enrichRows,getDossier,getPrice,getForwardRecord,readStore} from '@/lib/value/store';
import {unpackView,browserRow,type BrowserPayload,type BrowserRow} from '@/lib/value/browser-view';
import {matchesView} from '@/lib/value/view-filter';
import {mainCompanies,mainZones} from '@/lib/value/main-layout';
import {QUALITY_TESTS,type HistoryIndex,type SearchShard,type PriceMap} from '@/lib/value/types';
import {shardKeyFor,type SearchManifest} from '@/lib/value/search-shard';
import {searchShard} from '@/lib/value/search';
import {METHOD_CHANGES,METHOD_VERSION} from '@/lib/value/method-version';
import {metricLabels} from '@/lib/value/metric-labels';
import {metricHelp} from '@/lib/value/metric-help';
import {projectDossier,projectHoldings} from './projections';
import type {Route} from './config';
export class DataError extends Error {constructor(public status:number,public code:string,message:string){super(message);}}
const positiveInt=(max:number,defaultValue:number)=>z.coerce.number().int().min(1).max(max).default(defaultValue);
const quarter=z.string().regex(/^\d{4}Q[1-4]$/);
const query=z.object({q:z.string().trim().max(100).optional(),quarter:quarter.optional(),limit:positiveInt(10000,50),offset:z.coerce.number().int().min(0).max(100000).default(0),list:z.enum(['buy-now','next-closest','all']).default('all'),markets:z.enum(['western','all']).default('western'),country:z.string().regex(/^[A-Z]{2}$/).optional(),sector:z.string().max(100).optional(),held:z.enum(['0','1']).optional(),tags:z.string().max(200).optional(),near:z.enum(['0','1']).optional(),awaiting:z.enum(['0','1']).optional(),gate:z.string().regex(/^[0-6]$/).optional(),understandable:z.enum(['pass','fail']).optional(),moat:z.enum(['pass','fail']).optional(),economics:z.enum(['pass','fail']).optional(),management:z.enum(['pass','fail']).optional(),accounting:z.enum(['pass','fail']).optional()}).strict();
export type Query=z.infer<typeof query>;
const filters=['list','markets','country','sector','held','tags','near','awaiting','gate',...QUALITY_TESTS.filter(k=>k!=='price'),'q','limit','offset'];
export function parseQuery(params:URLSearchParams,route:Route):Query {
 const allowed=route.id==='search'?['q','limit']:route.id==='investors'?['q','limit','offset']:['holdings','ownership'].includes(route.id)?['quarter']:['companies','checklists','export','quarter'].includes(route.id)?filters:route.id==='history'?['markets']:[];
 for(const key of params.keys())if(!allowed.includes(key)||params.getAll(key).length!==1)throw new DataError(400,'invalid_query',`Unsupported or duplicate query parameter: ${key}`);
 const parsed=query.safeParse(Object.fromEntries(params));
 if(!parsed.success)throw new DataError(400,'invalid_query','Invalid query parameters; see /api/v1/openapi.json.');
 if(parsed.data.limit>(route.id==='export'?10000:200))throw new DataError(400,'invalid_limit','Maximum limit is 200 (10000 for export).');
 if(route.id==='export'&&!params.has('limit'))parsed.data.limit=10000;
 if(route.id==='search'&&!parsed.data.q)throw new DataError(400,'missing_query','Supply q to search.');
 return parsed.data;
}
function pagination<T>(items:T[],q:Query){return {items:items.slice(q.offset,q.offset+q.limit),offset:q.offset,limit:q.limit,total:items.length,nextOffset:q.offset+q.limit<items.length?q.offset+q.limit:null};}
async function loadRows(frame?:string) {
 const meta=await getMeta();if(!meta)throw new DataError(503,'data_unavailable','Research metadata is unavailable.');
 const manifest=meta.views;
 const primary=frame?manifest?.quarters?.[frame]??(frame.endsWith('Q4')?manifest?.years[frame.slice(0,4)]:undefined):manifest?.current;
 if(frame&&!primary)throw new DataError(404,'quarter_unavailable','This quarter has not been published; see /api/v1/time-travel.');
 const deferred=frame?manifest?.quarterDeferred?.[frame]??(frame.endsWith('Q4')?manifest?.yearDeferred?.[frame.slice(0,4)]:undefined):manifest?.deferred;
 let rows:BrowserRow[];
 if(primary){const parts=await Promise.all([primary,...deferred??[]].map(file=>readStore<BrowserPayload>(file)));if(parts.some(p=>!p))throw new DataError(503,'data_unavailable','A published view is temporarily unavailable.');rows=parts.flatMap(p=>unpackView(p!));}
 else {const source=await enrichRows(await getDefaultIndex());const quotes=Object.assign({},...await Promise.all([...new Set(source.map(r=>r.c))].map(cc=>readStore<PriceMap>(`prices/${cc}.json`))));rows=source.map(r=>browserRow(r,quotes[r.id]??null));}
 return {meta,rows:[...new Map(rows.map(r=>[r.id,r])).values()]};
}
export async function listing(q:Query,frame?:string) {
 const {meta,rows}=await loadRows(frame);
 const filter=Object.fromEntries(Object.entries(q).filter(([,v])=>typeof v==='string')) as Record<string,string>;
 filter.search=q.q??'';delete filter.q;
 // Gate 0 exposes all scored/insufficient rows. Explicit filters retain the website matcher.
 const filtered=rows.filter(row=>{
  if(q.list==='all'&&!q.gate&&!q.awaiting&&!q.near&&!QUALITY_TESTS.some(k=>q[k as keyof Query])){
   if(!matchesView(row,{...filter,gate:'0'}))return false;
   return (!q.sector||row.s===q.sector)&&(q.held!=='1'||row.h>0)&&(!q.tags||q.tags.split(',').every(t=>row.g.includes(t)));
  }
  return matchesView(row,filter);
 });
 const companies=mainCompanies(filtered.map(row=>({row,quote:row.quote?.[0]??null,expected:row.expected,historical:Boolean(frame),historicalPrice:row.historicalPrice,historicalReturn:row.gain,basis:row.basis,mos:row.pm??null})));
 const zones=mainZones(companies),selected=q.list==='buy-now'?zones.buy:q.list==='next-closest'?zones.next:[...zones.buy,...zones.next,...zones.rest];
 const items=selected.map(c=>({id:c.id,name:c.name,country:c.entry.row.c,sector:c.entry.row.s,currency:c.entry.row.cur,westernListing:c.entry.row.w??null,tests:c.entry.row.t,buyNow:c.buy,buyBelow:c.buyPrice,priceToBuy:c.ratio,expectedReturn:c.expected,sinceReturn:frame?c.entry.historicalReturn??null:null,returnAsOf:frame?(c.entry.row as BrowserRow).outcome?.date??null:null,tags:c.entry.row.g,holderCount:c.entry.row.h,quality:c.entry.row.quality?{label:c.entry.row.quality.label,value:c.entry.row.quality.value}:null}));
 return {asOf:meta.asOf,quarter:frame??null,markets:q.markets,list:q.list,...pagination(items,q)};
}
export async function executeEndpoint(route:Route,pathname:string,q:Query):Promise<unknown> {
 const parts=pathname.replace(/\/$/,'').split('/'),id=parts[4]?.toUpperCase();
 if(id&&route.id!=='quarter'&&!/^[A-Z0-9][A-Z0-9.&_-]{0,39}$/.test(id))throw new DataError(400,'invalid_id','Invalid stable identifier.');
 switch(route.id){
 case 'search':{
  const [index,manifest]=await Promise.all([getSearchIndex(),readStore<SearchManifest>('search/manifest.json')]);
  if(!manifest)throw new DataError(503,'search_unavailable','Company search index is unavailable.');
  const key=shardKeyFor(q.q!,manifest),shard=key?await readStore<SearchShard>(`search/${key}.json`):null;
  return {query:q.q,limit:q.limit,stocks:(index?.stocks??[]).filter(s=>`${s.t} ${s.n}`.toLowerCase().includes(q.q!.toLowerCase())).slice(0,q.limit).map(s=>({id:s.t,name:s.n,holderCount:s.h})),scope:'Company search includes analysed and pending companies; prefix shards are ranked like the website.',investors:(index?.investors??[]).filter(i=>`${i.code} ${i.person} ${i.firm}`.toLowerCase().includes(q.q!.toLowerCase())).slice(0,q.limit).map(i=>({id:i.code,name:i.person,firm:i.firm})),companies:(shard?searchShard(shard,q.q!,q.limit):[]).map(r=>({id:r[0],name:r[1],country:r[2],analysed:r[3]==='a',westernListing:r[5]??null}))};
 }
 case 'investors':{const index=await getIndex();if(!index)throw new DataError(503,'data_unavailable','Investor directory unavailable.');return {asOf:index.generatedAt,...pagination(index.investors.filter(i=>!q.q||`${i.person} ${i.firm} ${i.code}`.toLowerCase().includes(q.q.toLowerCase())).map(i=>({id:i.code,name:i.person,firm:i.firm,quarters:i.series.map(s=>s.q.replace(/\s/g,''))})),q)};}
 case 'holdings':{const source=await getInvestor(id!);const investor=source?{...source,quarters:source.quarters.map(q=>({...q,q:q.q.replace(/\s/g,'')}))}:null;if(!investor)throw new DataError(404,'investor_not_found','Investor not found.');const frame=q.quarter??[...investor.quarters].map(x=>x.q).sort().at(-1);if(!frame||!investor.quarters.some(x=>x.q===frame))throw new DataError(404,'quarter_unavailable','Investor quarter unavailable.');return projectHoldings(investor,frame);}
 case 'ownership':{
  const stock=await getStock(id!);if(!stock)throw new DataError(404,'stock_not_found','Tracked stock not found. Use its ticker from search.');
  const quarters=stock.quarters.map(v=>({...v,q:v.q.replace(/\s/g,'')})).sort((a,b)=>a.q.localeCompare(b.q));
  const selected=q.quarter?quarters.find(v=>v.q===q.quarter):quarters.at(-1);if(!selected)throw new DataError(404,'quarter_unavailable','Stock quarter unavailable.');
  const index=await getIndex(),names=new Map(index?.investors.map(i=>[i.code,i.person])??[]),total=selected.holders.reduce((s,h)=>s+h.value,0);
  return {id:stock.ticker,name:stock.name,quarter:selected.q,quarters:quarters.map(v=>v.q),holderCount:selected.holders.length,holders:[...selected.holders].sort((a,b)=>b.value-a.value).map((h,i)=>({id:h.code,name:names.get(h.code)??h.code,rank:i+1,shareOfTrackedCapital:total?h.value/total:0})),basis:'Relative shares of capital held by tracked investors, computed from reported 13F positions. Not shares outstanding or raw position values.'};
 }
 case 'companies':case 'checklists':case 'export':return listing(q);
 case 'dossier':case 'verdict':case 'memo':case 'priceStory':{
  const dossier=await getDossier(id!);if(!dossier)throw new DataError(404,'company_not_found','No published dossier for this company.');
  const projected=projectDossier(dossier,await getPrice(id!,dossier.company.country));
  if(route.id==='memo')return {id:dossier.id,memo:projected.memo};if(route.id==='priceStory')return {id:dossier.id,priceStory:projected.priceStory};
  if(route.id==='verdict'){const {id,asOf,verdict,buyNow,qualityPasses,tests,priceCheck}=projected;return {id,asOf,verdict,buyNow,qualityPasses,tests:tests.map(t=>({id:t.id,result:t.result})),priceCheck};}
  return projected;
 }
 case 'history':case 'quarter':{
  const history=await readStore<HistoryIndex>('history/index.json');if(!history)throw new DataError(503,'history_unavailable','History is unavailable.');
  const summaries=(q.markets==='western'?history.western?.perQuarter:history.perQuarter)??{};
  const common={assumptions:history.assumptions??[],caveats:history.caveats??[]};
  if(route.id==='history')return {asOf:history.asOf??null,markets:q.markets,quarters:history.quarters??Object.keys(summaries).sort(),summaries,...common};
  const frame=parts[4];if(!quarter.safeParse(frame).success)throw new DataError(400,'invalid_quarter','Use YYYYQ1 through YYYYQ4.');
  return {...await listing(q,frame),summary:summaries[frame]??null,...common};
 }
 case 'changelog':return {version:METHOD_VERSION,changes:METHOD_CHANGES};
 case 'method':return {version:METHOD_VERSION,description:`${VALUE_PRODUCT_NAME}: five independent quality tests plus a price check. Model choices inspired by principles Buffett and Munger describe; no blended score and no endorsement.`,tests:METHOD_SECTIONS.map(([id,,description])=>({id,description})),rules:Object.entries(metricLabels).filter(([,m])=>m.threshold!==undefined&&m.better).map(([id,m])=>({id,label:m.label,threshold:m.threshold!,better:m.better!,strict:!!m.strict,explanation:metricHelp(id,m.label).why})),assumptions:['Operating valuations project ten years plus a terminal value.','Required return is at least 10%, or the local ten-year bond yield plus four percentage points.','Historical simulations have hindsight and coverage limitations; consult the time-travel caveats.','Forward record uses immutable dated observations.','Financial companies and investment holdings use their published sector-specific valuation models.','Research estimates are not forecasts or investment advice.']};
 case 'forward':return getForwardRecord();
 }
}
