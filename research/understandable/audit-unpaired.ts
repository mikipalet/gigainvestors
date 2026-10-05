/** Quality is currency-unit invariant. Audit skipped FX rows without treating an
 * artificial 1:1 rate as a valid valuation or portfolio observation. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {snapshotForQuarter as baseline} from '../../.audit/understandable/baseline/lib/value/quarterly-snapshots';
import {snapshotForQuarter as candidate} from '../../.audit/understandable/candidate/lib/value/quarterly-snapshots';
const read=(p:string|URL)=>JSON.parse(gunzipSync(readFileSync(p)).toString());
const rows=read(new URL('./outputs/replay.json.gz',import.meta.url)).filter((r:any)=>r.status==='reporting/trading currency mismatch');
const groups=new Map<string,any[]>();for(const r of rows)groups.set(r.id,[...groups.get(r.id)??[],r]);
const changes:any[]=[],unavailable:any[]=[];let tested=0;
for(const [id,rs] of groups){
 const original=homedir()+`/data/value-research/inputs/replay/${id}.json.gz`;
 const input=read(existsSync(original)?original:new URL(`../../.audit/understandable/replay/${id}.json.gz`,import.meta.url));
 for(const r of rs){
  const args={...input,quarter:r.quarter,interims:input.allInterims[r.quarter]??[],fxRate:1};
  const a=baseline(args),b=candidate(args);
  if(!a||!b){unavailable.push({id,quarter:r.quarter});continue;}
  tested++;
  if(a.numeric.understandable.numeric===b.numeric.understandable.numeric)continue;
  const s=r.stored,expected=s[7]?.expected;
  const pricePass=s[2]!==null&&s[2]>0&&s[2]<=1-s[5].discount&&expected!=null&&expected>=.1;
  changes.push({id,quarter:r.quarter,before:a.numeric.understandable.numeric,after:b.numeric.understandable.numeric,stored:s[1],pricePass,possibleNewBuy:s[1][0]!=='P'&&s[1].slice(1)==='PPPP'&&pricePass,rawCvUnchanged:a.numeric.understandable.metrics.opMarginCv===b.numeric.understandable.metrics.opMarginCv});
 }
}
const result={rows:rows.length,tested,unavailable,changes,possibleNewBuys:changes.filter(c=>c.possibleNewBuy)};
writeFileSync(new URL('./outputs/unpaired-audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({rows:rows.length,tested,unavailable:unavailable.length,changes:changes.length,possibleNewBuys:result.possibleNewBuys.length}));
