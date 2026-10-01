import { existsSync, readFileSync } from 'node:fs';
import { corpusPath, readCorpusJson } from '../corpus';
import { readPrices } from '../price-files';
import { readPriceHistory } from '../price-history';
import { universeCompanies } from '../companies';
import { thesisTriggers } from './decision';
import type { Analysis, Fundamentals, IndexRow } from '../types';
export function selectThesisCandidates(asOf:string){
 const published=readCorpusJson<IndexRow[]>('publish-repo/index/default.json')??[];
 const byId=new Map(published.map(r=>[r.id,r]));
 const prices=readPrices(corpusPath('publish-repo/prices'));
 const from=new Date(asOf);from.setUTCFullYear(from.getUTCFullYear()-2);
 return universeCompanies().filter(c=>c.indexes?.length).flatMap(company=>{
  const analysis=readCorpusJson<Analysis>(`analysis/${company.id}.json`);if(!analysis)return [];
  const row=byId.get(company.id),quality=analysis.status==='scored'&&Object.values(analysis.tests).every(t=>t.result==='pass');
  const f=readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
  const history=(readPriceHistory(company.id)??[]).filter(([date])=>date>=from.toISOString().slice(0,7)&&date<=asOf.slice(0,7));
  const high=history.length?Math.max(...history.map(([,p])=>p)):null;
  const quote=prices[company.id]?.[0];
  const drawdown=high&&quote?1-quote/high:null;
  const charges=(f?.years??[]).slice(-2).flatMap(y=>{
   const extended=y as typeof y&{legalCharges?:number;provisions?:number};
   return [y.creditLossProvision,extended.legalCharges,extended.provisions].filter((amount):amount is number=>amount!=null).map(amount=>({amount,equity:y.equity??NaN}));
  });
  const triggers=thesisTriggers({buy:row?.b===true,next:quality&&row?.b!==true,quality,drawdown,financial:company.kind!=='operating',charges});
  // Numeric provider fields omit legal/redress charges for some lenders. Read any
  // financial issuer with a relevant note rather than silently missing it.
  if(company.kind!=='operating'&&!triggers.includes('financial_charges')){
   const notes=corpusPath(`reports/${company.id}/notes.txt`);
   if(existsSync(notes)&&/redress|litigation|legal provision|regulatory provision/i.test(readFileSync(notes,'utf8')))triggers.push('financial_disclosure_review');
  }
  return triggers.length?[{company:{...company,...readCorpusJson<Partial<typeof company>>(`companies/${company.id}.json`)},analysis,fundamentals:f,triggers,drawdown}]:[];
 });
}
