import {readFileSync,writeFileSync} from 'node:fs';
import {shardOf} from '../../../../lib/value/shard';
import {refreshBalanceValuation} from '../../../../lib/value/refresh-balance-valuation';
const root=process.env.PUBFIX_ROOT!,read=(p:string)=>{try{return JSON.parse(readFileSync(root+'/corpus/'+p,'utf8'))}catch{return null}};
const wanted:Record<string,number>={'ALSN.US':137.57981670597013,'FDJU.PA':29.980346134424614,'YUMC.US':49.22841498815448,'GAMA.LSE':15.382742477753606};
const rows=Object.entries(wanted).map(([id,want])=>{const d=JSON.parse(readFileSync(root+`/baseline-out/dossiers/${shardOf(id)}.json`,'utf8'))[id],next=refreshBalanceValuation(d,read,'2026-10-05');if(Math.abs(next.valuation!.perShare.mid-want)>1e-9)throw Error(id+' changed unexpectedly');return {id,before:d.valuation.perShare.mid,after:next.valuation!.perShare.mid,balance:next.valuation!.balanceSheet,requiredMos:next.requiredMos};});
writeFileSync(root+'/evidence/targets.json',JSON.stringify(rows,null,2));console.log('Four reviewed values reproduced');
