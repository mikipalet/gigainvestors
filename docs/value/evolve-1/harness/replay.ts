import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync,statfsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {snapshotForQuarter as baseline} from '../../../../.audit/evolve-1/engines/baseline/lib/value/quarterly-snapshots';
import {snapshotForQuarter as government_discount} from '../../../../.audit/evolve-1/engines/government_discount/lib/value/quarterly-snapshots';
import {snapshotForQuarter as economic_progress} from '../../../../.audit/evolve-1/engines/economic_progress/lib/value/quarterly-snapshots';
import {snapshotForQuarter as combined} from '../../../../.audit/evolve-1/engines/combined/lib/value/quarterly-snapshots';
import {valuationReturnModel,modelValue} from '../../../../lib/value/return-model';
const root='.audit/evolve-1',out=root+'/research';
const json=(p:string)=>{const b=readFileSync(p);return JSON.parse(p.endsWith('.gz')?gunzipSync(b).toString():b.toString());};
const seal=json(root+'/evidence/research-seal.json');
for(const [p,h]of Object.entries({...seal.engines,...seal.inputs}))if(createHash('sha256').update(readFileSync(p)).digest('hex')!==h)throw Error('Frozen source/input changed '+p);
globalThis.fetch=async()=>{throw Error('NETWORK DISABLED');};
const guard=()=>{for(const p of ['/','/Users/miki/data']){const s=statfsSync(p);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');}if(existsSync(root+'/evidence/DISK_STOP'))throw Error('DISK STOP');};
mkdirSync(out+'/candidate',{recursive:true});let n=0,total=0;
for(const [index,file] of readdirSync(out+'/baseline').sort().entries()){
 if(index%Number(process.env.PARTS??1)!==Number(process.env.PART??0))continue;
 if(existsSync(out+'/candidate/'+file))continue;guard();
 const id=file.replace('.json.gz',''),original='/Users/miki/data/value-research/inputs/replay/'+file;
 const input=json(existsSync(original)?original:out+'/replay/'+file),records=json(out+'/baseline/'+file),results:any[]=[];
 for(const r of records){
  if(r.status!=='paired'){results.push({id,quarter:r.quarter,status:r.status,stored:r.stored});continue;}
  const currency=r.valuation?.currency??input.fundamentals.currency;
  const args={...input,quarter:r.quarter,interims:input.allInterims[r.quarter]??[],fxRate:currency==='GBP'&&input.company.currency==='GBX'?100:1};
  const b=baseline(args);if(!b)throw Error('Baseline snapshot unavailable '+id);
  const variants:any={};
  for(const [name,run]of Object.entries({government_discount,economic_progress,combined})){
   const x=run(args);if(!x)throw Error('Candidate snapshot unavailable '+id);
   const v=x.valuation;
   if(v){const model=valuationReturnModel(v);if(model&&Math.abs(modelValue(model,v.discountRate)-v.perShare.mid)>1e-6*Math.max(1,v.perShare.mid))throw Error('Value/return mismatch '+id);}
   if(x.row[3]&&(x.row[1]!=='PPPPP'||x.row[2]===null||x.row[2]>1-x.row[5]!.discount+1e-6))throw Error('Buy gate mismatch');
   variants[name]={row:x.row,changed:JSON.stringify(b.row)!==JSON.stringify(x.row),valuation:v?{mid:v.perShare.mid,normalized:v.normalized,growth:v.growth,method:v.method,discountRate:v.discountRate,requiredReturn:(v as any).requiredReturn}:null};
  }
  results.push({id,quarter:r.quarter,status:'paired',baseline:b.row,baselineValuation:b.valuation?{mid:b.valuation.perShare.mid,method:b.valuation.method}:null,variants});
 }
 writeFileSync(out+'/candidate/'+file,gzipSync(JSON.stringify(results)));total+=results.length;if(++n%25===0)console.log(n,'identities',total,'rows');
}
console.log('DONE',n,total);
