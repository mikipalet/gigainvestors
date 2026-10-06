import {expect,it} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {buildOutput} from '@/lib/value/build-output';
import {shardOf} from '@/lib/value/shard';
import type {Dossier} from '@/lib/value/types';
const base=readdirSync('tests/fixtures/value/store/dossiers').flatMap(f=>Object.values(JSON.parse(readFileSync(`tests/fixtures/value/store/dossiers/${f}`,'utf8')))).find((a:any)=>a.id==='KO.US') as Dossier;
function run(published:boolean){
 const a=structuredClone(base);a.company.marketCapUsd=null;a.valuation!.assumptions=['Unverified share count: providers disagree'];a.valuation!.shares*=1.1;
 return buildOutput({analyses:[a],previousDossiers:published?{[a.id]:base}:{},prices:{[a.id]:[60,'2026-10-06']},holdersByTicker:{},investorNames:{},fx:{}}).files[`dossiers/${shardOf(a.id)}.json`] as Record<string,Dossier>;
}
it('retains a previously visible valuation and explains the share disagreement',()=>{
 const d=run(true)[base.id];expect(d.valuation).not.toBeNull();
 expect(d.valuation?.assumptions.some(s=>s.includes('Previously published share basis retained'))).toBe(true);
 expect(d.valuation?.publishedShareReview).toBe(true);expect(d.valuation?.shares).toBe(base.valuation!.shares);
});
it('keeps the strict share rule for a never-published company',()=>expect(run(false)[base.id].valuation).toBeNull());
it('suppresses a retained valuation when a comparable issuer filing contradicts its shares',()=>{
 const a=structuredClone(base);a.company.marketCapUsd=null;a.valuation!.assumptions=['Unverified share count'];
 const files=buildOutput({analyses:[a],previousDossiers:{[a.id]:base},issuerContradictions:{[a.id]:[{source:'issuer:sec',shares:1,date:'2026-06-30',url:'https://www.sec.gov/Archives/edgar/data/1/filing.htm',basis:'all-ordinary-outstanding'}]},prices:{[a.id]:[60,'2026-10-06']},holdersByTicker:{},investorNames:{},fx:{}}).files;
 expect((files[`dossiers/${shardOf(a.id)}.json`] as Record<string,Dossier>)[a.id].valuation).toBeNull();
});
