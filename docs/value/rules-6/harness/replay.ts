import {snapshotForQuarter as parent_allocation} from '../../../../.audit/rules-6/engines/parent_allocation/lib/value/quarterly-snapshots';
import {snapshotForQuarter as ocf_fallback} from '../../../../.audit/rules-6/engines/ocf_fallback/lib/value/quarterly-snapshots';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync,statfsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {snapshotForQuarter as sbc_once} from '../../../../.audit/rules-6/engines/sbc_once/lib/value/quarterly-snapshots';
import {snapshotForQuarter as current_scale} from '../../../../.audit/rules-6/engines/current_scale/lib/value/quarterly-snapshots';
import {snapshotForQuarter as ttm_maintenance} from '../../../../.audit/rules-6/engines/ttm_maintenance/lib/value/quarterly-snapshots';
import {snapshotForQuarter as flow_inputs} from '../../../../.audit/rules-6/engines/flow_inputs/lib/value/quarterly-snapshots';
import {snapshotForQuarter as combined} from '../../../../.audit/rules-6/engines/combined/lib/value/quarterly-snapshots';
import {valuationReturnModel,modelValue} from '../../../../lib/value/return-model';
globalThis.fetch=async()=>{throw Error('NETWORK DISABLED');};
const out='.audit/rules-6/research',root=process.env.REPLAY_INPUT_ROOT??'/Users/miki/data/value-research',cache='.audit/rules-6/research/replay';
const json=(p:string)=>{const b=readFileSync(p);return JSON.parse(p.endsWith('.gz')?gunzipSync(b).toString():b.toString());};
const guard=()=>{for(const p of ['/','/Users/miki/data']){const s=statfsSync(p);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');}};
const seal=json('.audit/rules-6/evidence/research-seal.json');for(const [p,h]of Object.entries(seal.engines))if(createHash('sha256').update(readFileSync(p)).digest('hex')!==h)throw Error('Frozen source changed '+p);
mkdirSync(out+'/candidate',{recursive:true});let n=0,total=0;
for(const [index,file]of readdirSync(out+'/baseline').sort().entries()){
 if(index%Number(process.env.PARTS??1)!==Number(process.env.PART??0))continue;
 if(existsSync(out+'/candidate/'+file)&&!process.env.REPLAY_REFRESH)continue;guard();
 const id=file.replace('.json.gz',''),input=json(existsSync(root+'/inputs/replay/'+file)?root+'/inputs/replay/'+file:cache+'/'+file),records=json(out+'/baseline/'+file),results:any[]=[],previous=process.env.REPLAY_REFRESH&&existsSync(out+'/candidate/'+file)?json(out+'/candidate/'+file):[];
 for(const r of records){
  if(r.status!=='paired'){results.push({id,quarter:r.quarter,status:r.status,stored:r.stored});continue;}
  const currency=r.valuation?.currency??input.fundamentals.currency,fxRate=currency==='GBP'&&input.company.currency==='GBX'?100:1;
  const variants:any={...(previous.find((p:any)=>p.quarter===r.quarter)?.variants??{})};
  for(const [name,run]of Object.entries({sbc_once,current_scale,ttm_maintenance,flow_inputs,parent_allocation,ocf_fallback,combined}).filter(([name])=>!process.env.REPLAY_REFRESH||process.env.REPLAY_REFRESH.split(',').includes(name))){
   const x=run({...input,quarter:r.quarter,interims:input.allInterims[r.quarter]??[],fxRate});if(!x)throw Error('Candidate unavailable '+id+' '+r.quarter);
   const v=x.valuation;
   if(v){
    const model=valuationReturnModel(v);if(model&&Math.abs(modelValue(model,v.discountRate)-v.perShare.mid)>1e-6*Math.max(1,v.perShare.mid))throw Error('Value/return mismatch '+id);
    if(v.method==='owner_earnings'){
     const end=v.bridge.findIndex(r=>r.label==='= owner earnings'),sum=v.bridge.slice(0,end).reduce((s,r)=>s+r.value,0);
     if(Math.abs(sum-v.normalized)>1e-6*Math.max(1,v.normalized))throw Error('Bridge mismatch '+name+' '+id+' '+r.quarter+' '+sum+' '+v.normalized);
    }
   }
   if(x.row[3]&&(x.row[1]!=='PPPPP'||x.row[2]===null||x.row[2]>1-x.row[5]!.discount+1e-6))throw Error('Buy gate mismatch');
   const changed=JSON.stringify(r.baseline)!==JSON.stringify(x.row);
   variants[name]={row:x.row,changed,valuation:v?{normalized:v.normalized,mid:v.perShare.mid,growth:v.growth,tier:v.tier,method:v.method}:null,...(changed?{economics:x.numeric.economics.metrics,qualityReasons:Object.fromEntries(Object.entries(x.numeric).map(([k,t])=>[k,t.reasons]))}:{})};
  }
  results.push({id,quarter:r.quarter,status:'paired',baseline:r.baseline,variants});
 }
 writeFileSync(out+'/candidate/'+file,gzipSync(JSON.stringify(results)));total+=results.length;if(++n%25===0)console.log(n,'identities',total,'rows');
}
console.log('DONE',n,total);
