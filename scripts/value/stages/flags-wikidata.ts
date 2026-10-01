import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {diskGuard} from '../../../lib/value/thesis/sources';
import {IDENTITIES} from '../../../lib/value/flags/identities';
import {universeCompanies} from '../../../lib/value/companies';
import {resolveCounterparty} from '../../../lib/value/flags/relationships';
import type {Relationship} from '../../../lib/value/flags/types';
import {FLAG_COMPANIES} from './flags-fetch';
/** Structured identity links are independent of Jev; only current, non-deprecated claims. */
export default async function wikidata({only=FLAG_COMPANIES}:{only?:string[]}){
 const universe=universeCompanies(),companies=IDENTITIES.filter(c=>universe.some(u=>u.id===c.id));
 const get=async(id:string)=>{diskGuard();const cached=readCorpusJson<any>(`flags/wikidata/entities/${id}.json`);if(cached)return cached;const res=await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`,{signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error(`Wikidata HTTP ${res.status}`);const entity=(await res.json()).entities[id];writeCorpusJson(`flags/wikidata/entities/${id}.json`,entity);return entity;};
 for(const owner of IDENTITIES.filter(c=>only.includes(c.id)&&c.wikidata)){
  diskGuard();const edges:Relationship[]=[];try{const entity=await get(owner.wikidata!);
   for(const property of ['P749','P355'])for(const claim of (entity.claims?.[property]??[]).slice(0,20)){
    if(claim.rank==='deprecated'||claim.qualifiers?.P582||claim.mainsnak?.snaktype!=='value')continue;
    const id=claim.mainsnak.datavalue?.value?.id;if(!id)continue;
    const target=await get(id),name=target.labels?.en?.value;if(!name)continue;
    const exact=IDENTITIES.find(c=>c.wikidata===id&&universe.some(u=>u.id===c.id));
    const counterparty=exact??resolveCounterparty(name,companies,owner.id);if(counterparty.id===owner.id)continue;
    const from=property==='P355'?owner.id:counterparty.id,to=property==='P355'?counterparty.id:owner.id;
    edges.push({id:`${from}|${to}|subsidiary`,from,to,name:counterparty.name,basis:'wikidata',type:'subsidiary',counterparty,status:'one-sided',version:'wikidata-P749-P355-v1',evidence:[{quote:`${entity.labels?.en?.value??owner.name} → ${name} (${property})`,url:`https://www.wikidata.org/wiki/${owner.wikidata}#${property}`,filed:'2026-10-01',section:'Wikidata structured statement',disclosedBy:`Wikidata ${owner.wikidata}`} ]});
   }
   writeCorpusJson(`flags/wikidata/${owner.id}.json`,{edges});console.log(owner.id,edges.length,'current Wikidata links');
  }catch(e){if(String(e).includes('DISK STOP'))throw e;writeCorpusJson(`flags/wikidata/${owner.id}.json`,{edges,gap:e instanceof Error?e.message:'fetch failed'});console.log(owner.id,'Wikidata fetch gap');}
 }
}
