import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {readCorpusJson,readJsonl,writeCorpusJson} from '../../../lib/value/corpus';
import {heldStocks,mapHeldSecurity,securityExclusion,type HeldStock,type HeldSymbol,type HeldMembership,type HeldResolution} from '../../../lib/value/held-universe';
import {kindFor} from '../../../lib/value/universe';
import type {Company} from '../../../lib/value/types';

/** Offline, reproducible membership. Refresh provider identities separately under the shared quota. */
export default async function heldMembership():Promise<void>{
 const store=path.resolve(__dirname,'../../../data/store');
 const index=JSON.parse(readFileSync(path.join(store,'index.json'),'utf8')) as {quarters:string[];investors:Array<{code:string}>};
 const stocks=readdirSync(path.join(store,'stocks')).filter(f=>f.endsWith('.json')).flatMap(f=>Object.values(JSON.parse(readFileSync(path.join(store,'stocks',f),'utf8'))) as HeldStock[]);
 const quarters=[...new Set(index.quarters)].sort().slice(-8);
 const held=new Set(heldStocks(stocks,quarters,index.investors.map(i=>i.code)).map(s=>s.ticker));
 const cached=readCorpusJson<{date:string;data:HeldSymbol[]}>('raw/eodhd/universe/symbols-US.json');
 if(!cached?.data?.length)throw Error('US symbol cache required; refresh it under the EODHD quota first');
 const universe=new Map(readJsonl<Company>('universe.jsonl').map(c=>[c.id,c]));
 const resolutions=readCorpusJson<HeldResolution[]>('held-membership/resolutions.json')??[];
 const companies=new Map<string,Company>();
 const ledger:HeldMembership['ledger']=[];
 for(const stock of stocks.sort((a,b)=>a.ticker.localeCompare(b.ticker))){
  if(!held.has(stock.ticker)){ledger.push({ticker:stock.ticker,name:stock.name,cusip:stock.cusip??null,id:null,status:'outside-window',reason:'no positive tracked holding in latest eight quarters',evidence:['data/store/index.json',`data/store/stocks/${stock.ticker[0]}.json`]});continue;}
  const mapping=mapHeldSecurity(stock,cached.data,resolutions.find(r=>r.ticker===stock.ticker));
  mapping.evidence.push(`US symbol snapshot:${cached.date}`);
  if(mapping.status==='mapped'&&mapping.id){
   const raw=readCorpusJson<{General?:HeldSymbol&{Industry?:string;Sector?:string;CIK?:string;Description?:string}}> (`raw/eodhd/${mapping.id}.json`);
   const reason=raw?.General?securityExclusion(stock,raw.General):null;
   if(reason){mapping.status='excluded';mapping.reason=reason;mapping.evidence.push(`raw/eodhd/${mapping.id}.json:General`);}
   else{
    const symbol=cached.data.find(s=>`${s.Code}.US`===mapping.id);
    const prior=readCorpusJson<Company>(`companies/${mapping.id}.json`)??universe.get(mapping.id);
    if(!prior&&!symbol)throw Error(`Reviewed listing ${mapping.id} requires cached identity metadata`);
    companies.set(mapping.id,{id:mapping.id,name:symbol?.Name??prior!.name,code:symbol?.Code??prior!.code,exchange:'US',country:'US',currency:symbol?.Currency??'USD',isin:symbol?.Isin??null,cik:null,lei:null,edinetCode:null,sector:null,industry:null,kind:kindFor({sector:null,industry:null}),listings:[mapping.id],marketCapUsd:null,description:null,source:'eodhd',listingExchange:symbol?.Exchange,...prior,heldBySuperinvestors:true});
   }
  }
  ledger.push(mapping);
 }
 const snapshot:HeldMembership={version:1,asOf:new Date().toISOString(),quarters,companies:[...companies.values()],ledger};
 writeCorpusJson('held-membership/latest.json',snapshot);
 const counts=Object.fromEntries(['mapped','excluded','unresolved','outside-window'].map(status=>[status,ledger.filter(r=>r.status===status).length]));
 console.log(`held-membership: ${JSON.stringify({...counts,quarters})}`);
}
