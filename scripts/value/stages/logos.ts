import {existsSync,readdirSync} from 'node:fs';
import {loadCompanies} from '../../../lib/value/companies';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {generalInfoFor,type Enrichment} from '../../../lib/value/enrichment';
import {wikidataWebsite} from '../../../lib/value/wikidata-websites';
import {pool} from '../../../lib/value/http';
import {iconHash,LOGO_VALIDATION_VERSION} from '../../../lib/value/logo-validation';
import {resolveCompanyLogo,type LogoBinding} from '../../../lib/value/logo-sources';
import {checkLogoDisk,logoRequest} from '../../../lib/value/logo-fetch';
import {unpackView,type BrowserPayload} from '../../../lib/value/browser-view';
import {mainCompanies,mainZones} from '../../../lib/value/main-layout';
import type {IndexRow} from '../../../lib/value/types';
export async function logoIndex(request:typeof fetch,sites:string[]=[]):Promise<LogoBinding[]>{
 const file='enrichment-v7/logos/_wikidata.json';
 const cached=readCorpusJson<{rows:LogoBinding[];at:string;version?:number;siteHosts?:string[]}>(file);
 const fresh=cached?.version===3&&Date.now()-Date.parse(cached.at)<30*86400000;
 if(fresh&&sites.length===0)return cached.rows;
 const patterns=[
  '?item p:P414 ?listing. ?listing ps:P414 ?exchange; pq:P249 ?ticker.',
  '?item wdt:P946 ?isin.',
  '?item wdt:P1278 ?lei.',
  '?item wdt:P249 ?ticker; wdt:P414 ?exchange.',
 ];
 const rows:LogoBinding[]=fresh?cached.rows:[];let complete=true;
 for(const pattern of fresh?[]:patterns){
  const query=`SELECT DISTINCT ?item ?logo ?website ?isin ?lei ?ticker ?exchange WHERE { ${pattern} ?item wdt:P154 ?logo. ${pattern.includes('?website')?'':'OPTIONAL { ?item wdt:P856 ?website }'} }`;
  try{
   const r=await request('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query),{headers:{Accept:'application/sparql-results+json'}});
   if(!r.ok)throw Error('Wikidata P154 HTTP '+r.status);
   rows.push(...(await r.json()).results.bindings);
  }catch(e){complete=false;console.warn(String(e));}
 }
 const covered=new Set([...(fresh?cached.siteHosts??[]:[]),...rows.flatMap(r=>r.website?[new URL(r.website.value).hostname.replace(/^www\./,'')]:[])]);
 const remaining=[...new Set(sites.flatMap(site=>{try{const u=new URL(site.includes('://')?site:`https://${site}`);return covered.has(u.hostname.replace(/^www\./,''))?[]:[u.hostname.replace(/^www\./,'')];}catch{return [];}}))];
 for(let i=0;i<remaining.length;i+=10){
  const values=remaining.slice(i,i+10).flatMap(host=>['http','https'].flatMap(protocol=>['','www.'].flatMap(prefix=>['','/'].map(suffix=>`<${protocol}://${prefix}${host}${suffix}>`)))).join(' ');
  const query=`SELECT DISTINCT ?item ?logo ?website WHERE { VALUES ?website { ${values} } ?item wdt:P856 ?website; wdt:P154 ?logo. }`;
  try{const r=await request('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query));if(r.ok){rows.push(...(await r.json()).results.bindings);remaining.slice(i,i+10).forEach(host=>covered.add(host));}else{await r.body?.cancel();if(r.status===429||r.status===503)break;}}catch(e){console.warn(String(e));break;}
 }
 if(rows.length){checkLogoDisk();writeCorpusJson(file,{rows:[...new Map(rows.map(r=>[JSON.stringify(r),r])).values()],siteHosts:[...covered],version:complete?3:2,at:new Date().toISOString()});}
 return rows;
}
export function publishedLogoRows():IndexRow[]{
 const dir=corpusPath('publish-repo/index');if(!existsSync(dir))return [];
 return [...new Map(readdirSync(dir).filter(f=>/^[A-Z]{2}\.json$/.test(f)||f==='default.json').flatMap(f=>readCorpusJson<IndexRow[]>('publish-repo/index/'+f)??[]).map(r=>[r.id,r])).values()];
}
/** Only logo caches are written. Re-running resumes validated v2 assets; --force retries misses. */
export default async function logos(options:{only?:string[];limit?:number;force?:boolean}={}){
 checkLogoDisk();const request=logoRequest(),published=publishedLogoRows(),byId=new Map(published.map(r=>[r.id,r]));
 const meta=readCorpusJson<{views?:{current:string}}>('publish-repo/meta.json');
 const payload=meta?.views?.current?readCorpusJson<BrowserPayload>('publish-repo/'+meta.views.current):null;
 const visible=payload?mainZones(mainCompanies(unpackView(payload).map(row=>({row,quote:row.quote?.[0]??null,expected:row.expected,mos:null})))):null;
 const nextIds=new Set(visible?.next.map(c=>c.id));
 const companies=loadCompanies({only:options.only??(published.length?published.map(r=>r.id):undefined)}).sort((a,b)=>{
  const rank=(id:string)=>{const r=byId.get(id);return r?.b?0:nextIds.has(id)?1:r?.t==='PPPPP'?2:3;};return rank(a.id)-rank(b.id)||a.id.localeCompare(b.id);
 }).slice(0,options.limit);
 const before=companies.map(c=>({id:c.id,name:c.name,logo:byId.get(c.id)?.lg??null,cache:readCorpusJson(`enrichment-v7/logos/${c.id}.json`)}));
 const runId=Date.now();writeCorpusJson(`enrichment-v7/logos/runs/${runId}-before.json`,before);
 let rows:LogoBinding[]=[];try{rows=await logoIndex(request,companies.filter(c=>!c.logo).flatMap(c=>{const site=generalInfoFor(c).WebURL;return site?[site]:[];}));}catch(e){console.warn(String(e));}
 const websites=readCorpusJson<LogoBinding[]>('enrichment-v7/wikidata/websites.json')??[];
 const hashes=new Set<string>();
 // Both live default hashes and the versioned blocklist are checked by the validator.
 for(const url of ['https://www.google.com/s2/favicons?domain=value-logo-missing.invalid&sz=128','https://icons.duckduckgo.com/ip3/value-logo-missing.invalid.ico'])try{const r=await request(url);if(r.headers.get('content-type')?.startsWith('image/'))hashes.add(iconHash(new Uint8Array(await r.arrayBuffer())));}catch{}
 writeCorpusJson('enrichment-v7/logos/_default-hashes.json',[...hashes]);
 const stats={total:companies.length,checked:0,cached:0,recovered:0,unavailable:0,sources:{} as Record<string,number>};
 await pool({items:companies,concurrency:6,run:async company=>{
  checkLogoDisk();const file=`enrichment-v7/logos/${company.id}.json`;
  const previous=readCorpusJson<{logo?:string;validationVersion?:number;source?:string;matcherVersion?:number;retryable?:boolean;verifiedAt?:string}>(file);
  if(!(options.force&&options.only)&&previous?.validationVersion===LOGO_VALIDATION_VERSION&&(previous.source!=='wikidata-p154'||previous.matcherVersion===2)&&(previous.logo||(!options.force&&!previous.retryable&&Date.now()-Date.parse(previous.verifiedAt??'')<7*86400000))){stats.cached++;return;}
  const general=generalInfoFor(company),patch=readCorpusJson<Enrichment>(`enrichment-v7/companies/${company.id}.json`);
  const existing=patch?.logo??company.logo;
  if(!general.LogoURL&&existing?.startsWith('https://eodhd.com/'))general.LogoURL=existing;
  if(!general.LogoURL&&/^[A-Z0-9-]{1,12}$/.test(company.exchange)&&/^[A-Za-z0-9&._-]{1,60}$/.test(company.code))general.LogoURL=`https://eodhd.com/img/logos/${company.exchange==='JP'?'TSE':company.exchange}/${company.code}.png`;
  if(!general.WebURL&&existing?.startsWith('https://icons.duckduckgo.com/ip3/'))general.WebURL='https://'+existing.split('/').at(-1)!.replace(/\.ico$/,'');
  if(!general.WebURL)general.WebURL=wikidataWebsite(company,websites)??undefined;
  const {bytes,...result}=await resolveCompanyLogo(company,general,rows,request,hashes);
  checkLogoDisk();
  if(bytes&&result.asset)writeCorpusJson(`enrichment-v7/logos/assets/${result.asset}.json`,{data:bytes.toString('base64')});
  writeCorpusJson(file,{...result,logo:result.asset?`/api/value/logo?asset=${result.asset}`:null,validated:true,validationVersion:LOGO_VALIDATION_VERSION,matcherVersion:2,verifiedAt:new Date().toISOString()});
  stats.checked++;if(result.asset){stats.recovered++;stats.sources[result.source!]=(stats.sources[result.source!]??0)+1;}else stats.unavailable++;
  if(stats.checked%25===0)console.log(JSON.stringify(stats));
 }});
 writeCorpusJson(`enrichment-v7/logos/runs/${runId}-after.json`,stats);console.log(stats);return stats;
}
