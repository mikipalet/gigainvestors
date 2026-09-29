/** Rebuild a local design-QA snapshot from the live corpus without provider calls or publishing. */
import { currentShareInputs, leaseInputs, trailingInputs } from '../../lib/value/valuation-inputs';
import { checkIntegrity } from '../../lib/value/integrity';
import { normalizeEodhd } from '../../lib/value/normalize-eodhd';
import { mergeCompany, withEnglishName } from '../../lib/value/companies';
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { corpusPath, readCorpusJson, readJsonl } from '../../lib/value/corpus';
import { analyzeCompany } from '../../lib/value/analyze-company';
import { readPriceHistory } from '../../lib/value/price-history';
import { buildAdaptiveSearchShards } from '../../lib/value/search';
import { readPrices } from '../../lib/value/price-files';
import { buildOutput } from '../../lib/value/build-output';
import { assertIndexConsistency } from '../../lib/value/consistency';
import { createUsdRate } from '../../lib/value/fx';
import type { Company, Analysis, Dossier, Fundamentals, IndexRow, PriceMap, StoreMeta } from '../../lib/value/types';
async function main(){
 const out=process.argv[2]; if(!out?.startsWith('/tmp/'))throw new Error('Supply an isolated /tmp output directory');
 const source=corpusPath('publish-repo');mkdirSync(out,{recursive:true});
 cpSync(path.join(source,'search'),path.join(out,'search'),{recursive:true});
 const published: Dossier[]=readdirSync(path.join(source,'dossiers')).filter(f=>f.endsWith('.json')).flatMap(f=>Object.values(JSON.parse(readFileSync(path.join(source,'dossiers',f),'utf8'))));
 const merged=new Map(published.map(d=>[d.id,d]));
 for(const file of readdirSync(corpusPath('analysis')).filter(f=>f.endsWith('.json'))){const a=readCorpusJson<Analysis>(`analysis/${file}`);if(a?.id)merged.set(a.id,{...a,holders:merged.get(a.id)?.holders??[],series:a.series??{}});}
 const originals=[...merged.values()];
 const prices: PriceMap=Object.assign({},...readdirSync(path.join(source,'prices')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(path.join(source,'prices',f),'utf8'))));
 Object.assign(prices,readPrices(corpusPath('prices')));
 const rates:Record<string,number>={};
 for(const file of readdirSync(corpusPath('raw/eodhd/universe')).filter(f=>/^fx-/.test(f))){const data=readCorpusJson<{data:{close:number}[]}>(`raw/eodhd/universe/${file}`);if(data?.data[0])rates[file.slice(3,-5)]=data.data[0].close;}
 const usdRate=createUsdRate({rates});
 const bonds=readCorpusJson<Record<string,{yield:number|null}>>('bonds.json')??{};
 const analyses:Analysis[]=[], histories:Record<string,NonNullable<Dossier['priceHistory']>>={}, holdersByTicker:Record<string,string[]>={}, investorNames:Record<string,string>={};
 const missing:string[]=[];
 for(const old of originals){
  const raw=readCorpusJson<unknown>(`raw/eodhd/${old.id}.json`);
  if(raw){const normalized=normalizeEodhd(raw,old.id);const cap=normalized.marketCap;const rate=cap.currency?usdRate(cap.currency):null;old.company=mergeCompany(old.company,{...normalized.patch,...(cap.value!==null&&rate!==null?{marketCapUsd:cap.value*rate}:{})});}
  old.company=withEnglishName(old.company);
  const fundamentals=readCorpusJson<Fundamentals>(`fundamentals/${old.id}.json`);
  if(raw&&fundamentals){
   const normalized=normalizeEodhd(raw,old.id).fundamentals,mapped=new Map(normalized.years.map(y=>[y.end,y]));
   fundamentals.years=fundamentals.years.map(year=>{const fresh=mapped.get(year.end);return {...year,...leaseInputs(raw,year.end,old.company.country),...(fresh?{currency:fresh.currency,cash:fresh.cash,totalDebt:fresh.totalDebt,clientAssets:fresh.clientAssets}:{})};});
   if(normalized.integrity.notes?.some(note=>note.startsWith('reporting currency changed')))fundamentals.years=fundamentals.years.filter(y=>mapped.has(y.end));
   fundamentals.integrity=checkIntegrity(fundamentals,{source:old.company.source});fundamentals.ttm=trailingInputs(raw,fundamentals.years.at(-1));
  }
  const history=readPriceHistory(old.id);
  if(history)histories[old.id]=history;else if(old.priceHistory)histories[old.id]=old.priceHistory;
  for(const holder of old.holders){investorNames[holder.code]=holder.name;for(const id of old.company.listings.filter(id=>id.endsWith('.US'))){const ticker=id.slice(0,-3).replaceAll('-','.');(holdersByTicker[ticker]??=[]).push(holder.code);}}
  if(!fundamentals){missing.push(old.id);analyses.push(old);continue;}
  const attempts=readCorpusJson<{failures?:number}>(`prices-history/meta/${old.id}.json`);
  const next=await analyzeCompany({company:old.company,fundamentals,...currentShareInputs(raw,prices[old.id]?.[0]??null,old.company.currency),sections:{},report:old.report,priceHistory:history,priceHistoryPending:history===null&&(attempts?.failures??0)<3,
   bondYield:old.valuation?.bondYield??bonds[old.company.country]?.yield??null,getBondYield:async()=>bonds.US?.yield??null,usdRate:async currency=>usdRate(currency),ask:async()=>Object.values(old.tests).flatMap(t=>t.jev)});
  analyses.push(next);
 }
 const meta=JSON.parse(readFileSync(path.join(source,'meta.json'),'utf8'));
 const {files}=buildOutput({analyses,holdersByTicker,investorNames,fx:rates,prices,priceHistories:histories,universe:readJsonl<Company>('universe.jsonl').length});
 const universe=readJsonl<Company>('universe.jsonl');
 const search=buildAdaptiveSearchShards(universe,new Set(analyses.map(a=>a.id)));
 files['search/manifest.json']=search.manifest;
 for(const [key,shard] of Object.entries(search.shards))files[`search/${key}.json`]=shard;
 assertIndexConsistency({meta:files['meta.json'] as StoreMeta,rows:files['index/default.json'] as IndexRow[]});
 for(const [file,data] of Object.entries(files)){mkdirSync(path.dirname(path.join(out,file)),{recursive:true});writeFileSync(path.join(out,file),JSON.stringify(data));}
 writeFileSync(path.join(out,'qa-provenance.json'),JSON.stringify({at:new Date().toISOString(),source,originalAsOf:meta.asOf,count:analyses.length,missingFundamentals:missing,providerCalls:0},null,2));
 console.log(JSON.stringify({count:analyses.length,missing:missing.length,meta:files['meta.json']},null,2));
}
main();
