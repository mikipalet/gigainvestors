import type {Counterparty,Relationship} from './types';
const normal=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[.,’']/g,'').replace(/\b(incorporated|corporation|corp|inc|limited|ltd|plc|llc|co)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function resolveCounterparty(name:string,companies:Counterparty[],owner:string):Counterparty{
 const key=normal(name);
 if(/^(customer|supplier|distributor)\s+[a-z0-9]+$/i.test(name))return {id:`external:${owner.toLowerCase()}:${key.replace(/ /g,'-')}`,name};
 const matches=companies.filter(c=>[c.name,...c.aliases??[]].some(n=>normal(n)===key));
 if(matches.length===1)return {...matches[0],name:matches[0].name};
 // Fuzzy matches are intentionally not auto-published: the review queue owns them.
 return {id:`external:${key.replace(/ /g,'-')}`,name};
}
export function confirmRelationships(rows:Relationship[]):Relationship[]{
 const map=new Map<string,Relationship>();
 for(const row of rows){
  const key=[row.from,row.to,row.type].join('|');
  const old=map.get(key);
  const evidence=[...new Map([...(old?.evidence??[]),...row.evidence].map(e=>[e.disclosedBy+e.url+e.quote,e])).values()];
  const filingEvidence=evidence.filter(e=>!e.url.startsWith('https://www.wikidata.org/'));
  const parties=new Set(filingEvidence.map(e=>e.disclosedBy));
  const dates=filingEvidence.map(e=>Date.parse(e.filed));
  const contemporary=Math.max(...dates)-Math.min(...dates)<=370*86400000;
  const preferred=old&&(old.percent!=null||old.amount!=null)?old:row;
  map.set(key,{...preferred,id:key,evidence,status:contemporary&&parties.has(row.from)&&parties.has(row.to)?'confirmed':'one-sided'});
 }
 return [...map.values()];
}

/** Revenue belongs to the supplier; do not attribute its percentage to the customer's purchases. */
export function relationshipConcentrations(rows:Relationship[],owner:string):import('./types').BusinessFlag[]{
 return rows.flatMap(r=>{
  if(r.type!=='customer'||r.from!==owner||r.percent==null||r.percent<.1||r.percent>1||!['revenue','backlog'].includes(r.metric??'')||!r.evidence.length)return [];
  const period=Number(r.period?.slice(0,4));if(!Number.isFinite(period))return [];
  return [{id:`concentration-${r.to}`,kind:'customer_concentration',theme:'Who it depends on' as const,tone:'red' as const,severity:84,label:`${r.name}: ${Math.round(r.percent*100)}% of ${r.metric==='backlog'?'disclosed backlog':'revenue'}`,why:'A material share of the business depends on this disclosed customer; the percentage describes the reporting period, not the whole relationship.',question:'Could we replace this customer without losing earning power?',series:[[period,r.percent] as [number,number]],unit:'percent' as const,evidence:r.evidence,basis:'filing' as const,extraction:'relationship' as const,version:r.version,confidence:r.confidence,reviewed:r.reviewed}];
 });
}

/** Suggestions only: corporate-name similarity never establishes identity on its own. */
export function counterpartyCandidates(name:string,companies:Counterparty[]):Array<{id:string;name:string;score:number}>{
 const a=new Set(normal(name).split(' ').filter(w=>w.length>2));
 return companies.map(c=>({id:c.id,name:c.name,score:Math.max(...[c.name,...c.aliases??[]].map(alias=>{const b=new Set(normal(alias).split(' ').filter(w=>w.length>2)),shared=[...a].filter(w=>b.has(w)).length;return shared/Math.max(1,new Set([...a,...b]).size);} ))})).filter(c=>c.score>=.5).sort((a,b)=>b.score-a.score).slice(0,3);
}
