import {readCorpusJson,writeCorpusJson} from './corpus';
import type {Company} from './types';
type Binding=Record<string,{value:string}>;
const exchanges:Record<string,string>={TSE:'Q217475',JP:'Q217475',US:'Q13677',PA:'Q2385849',LSE:'Q171240',TW:'Q548621',KQ:'Q491503'};
async function websiteIndex():Promise<Binding[]> {
 const cached=readCorpusJson<Binding[]>('enrichment-v7/wikidata/websites.json');if(cached)return cached;
 const query='SELECT DISTINCT ?item ?website ?isin ?ticker ?exchange WHERE { ?item wdt:P856 ?website. { ?item wdt:P946 ?isin } UNION { ?item p:P414 ?listing. ?listing ps:P414 ?exchange; pq:P249 ?ticker } }';
 const r=await fetch('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query),{headers:{'User-Agent':'GigaInvestors/1.0 (https://gigainvestors.com)'},signal:AbortSignal.timeout(60000)});
 if(!r.ok)throw Error(`Wikidata ${r.status}`);
 const rows=(await r.json()).results.bindings as Binding[];writeCorpusJson('enrichment-v7/wikidata/websites.json',rows);return rows;
}
export function wikidataWebsite(company:Company,rows:Binding[]):string|null {
 const isin=company.isin?rows.filter(r=>r.isin?.value===company.isin):[];
 const exchange=exchanges[company.exchange]??(company.country==='JP'?'Q217475':null);
 const matches=isin.length?isin:exchange?rows.filter(r=>r.ticker?.value===company.code&&r.exchange?.value.endsWith('/'+exchange)):[];
 // Never choose between two issuers with the same ticker.
 return new Set(matches.map(r=>r.item.value)).size===1?matches[0]?.website.value??null:null;
}
