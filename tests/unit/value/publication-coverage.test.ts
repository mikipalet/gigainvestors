import {expect,it} from 'vitest';
import {measureCoverage,compareCoverage,samplePages,type Archive,type CoverageManifest} from '@/scripts/value/publication-coverage';
const baseline='a'.repeat(40);
function archive(n=1000){
 const rows=Array.from({length:n},(_,i)=>({id:`C${i}.US`,c:'US',lg:null,v:[1,2,3],st:'s',t:'PFPFP',b:true}));
 const dossiers=Object.fromEntries(rows.map(r=>[r.id,{id:r.id,company:{country:'US',currency:'USD',logo:null},status:'scored',valuation:{currency:'USD',perShare:{low:1,mid:2,high:3}},tests:Object.fromEntries(['understandable','moat','economics','management','accounting'].map(k=>[k,{result:'pass'}])),priceHistory:[['2026-01',10]]}]));
 return {'meta.json':{},'dossiers/000.json':dossiers,'index/US.json':rows} as Record<string,any>;
}
const measure=(files:Record<string,any>)=>measureCoverage({files:Object.keys(files),read:f=>files[f]??null} as Archive);
it.each(['valuation','quality','priceHistory','dossiers','index:US','buy:US'])('rejects >1%% %s loss with ids',metric=>{
 const old=archive(),next=structuredClone(old);
 for(let i=0;i<11;i++){
  const id=`C${i}.US`,d=next['dossiers/000.json'][id],row=next['index/US.json'][i];
  if(metric==='valuation')d.valuation=null;
  if(metric==='quality')d.tests.moat.result='unclear';
  if(metric==='priceHistory')d.priceHistory=[];
  if(metric==='dossiers')delete next['dossiers/000.json'][id];
  if(metric==='buy:US')row.b=false;
 }
 if(metric==='index:US')next['index/US.json'].splice(0,11);
 expect(()=>compareCoverage(measure(old),measure(next),baseline)).toThrow(new RegExp(`CRITICAL.*${metric}.*C0.US`,'s'));
});
it('permits normal churn at exactly 1% and five-company minimum, including evaluated failures',()=>{
 for(const [n,drop]of [[1000,10],[100,5]]){
  const old=archive(n),next=structuredClone(old);
  for(let i=0;i<drop;i++){next['dossiers/000.json'][`C${i}.US`].valuation=null;next['dossiers/000.json'][`C${i}.US`].tests.moat.result='unclear';next['index/US.json'][i].b=false;}
  expect(()=>compareCoverage(measure(old),measure(next),baseline)).not.toThrow();
 }
});
it('rejects country losses even when gains in another country offset them',()=>{
 const old=archive(100),next=structuredClone(old);next['index/US.json'].splice(0,6);next['index/JP.json']=old['index/US.json'].slice(0,6);
 expect(()=>compareCoverage(measure(old),measure(next),baseline)).toThrow(/index:US[\s\S]*C0.US/);
});
it('does not classify unclear, na or insufficient data as all five evaluated',()=>{
 const files=archive(10);files['dossiers/000.json']['C0.US'].tests.moat.result='unclear';files['dossiers/000.json']['C1.US'].tests.moat.result='na';files['dossiers/000.json']['C2.US'].status='insufficient_data';
 expect(measure(files).metrics.quality.size).toBe(7);
});
it('approves only exact ids, metric and baseline with evidence; new-logo gains cannot hide a lost logo',()=>{
 const old=archive(100),next=structuredClone(old);
 old['dossiers/000.json']['C0.US'].company.logo=old['index/US.json'][0].lg='https://example.com/old.png';
 next['dossiers/000.json']['C1.US'].company.logo=next['index/US.json'][1].lg='https://example.com/new.png';
 const a:CoverageManifest={version:1,approvals:[{baseline,metric:'logos',ids:['C0.US'],reason:'Reviewed wrong issuer',evidence:['https://example.com/review']}]};
 expect(()=>compareCoverage(measure(old),measure(next),baseline)).toThrow(/logos.*C0.US/);
 expect(()=>compareCoverage(measure(old),measure(next),baseline,a)).not.toThrow();
 expect(()=>compareCoverage(measure(old),measure(next),'b'.repeat(40),a)).toThrow(/logos/);
 expect(()=>compareCoverage(measure(old),measure(next),baseline,{...a,approvals:[{...a.approvals[0],metric:'valuation'}]})).toThrow(/logos/);
});
it('samples 20 distinct pages across countries, with logos represented',()=>{
 const files=archive(40);for(let i=0;i<40;i++)files['dossiers/000.json'][`C${i}.US`].company.country=i<20?'US':'JP';
 files['dossiers/000.json']['C19.US'].company.logo='https://example.com/a.png';
 const pages=samplePages(measure(files));expect(pages).toHaveLength(20);expect(new Set(pages.map(p=>p.id)).size).toBe(20);expect(new Set(pages.map(p=>p.country)).size).toBe(2);expect(pages.some(p=>p.logo)).toBe(true);
});
it('requires approval for a burst of newly missing logos and rejects an empty replacement',()=>{
 const old=archive(100),next=archive(106);
 expect(()=>compareCoverage(measure(old),measure(next),baseline)).toThrow(/missingLogos.*C100.US/);
 expect(()=>compareCoverage(measure(archive(1)),measure(archive(0)),baseline)).toThrow(/dossiers.*C0.US/);
});
it('allows a reviewed bulk logo removal without requiring duplicate missing-logo approvals',()=>{
 const old=archive(100),next=structuredClone(old),ids=Object.keys(old['dossiers/000.json']).slice(0,10);
 for(const id of ids){old['dossiers/000.json'][id].company.logo='https://example.com/logo.png';old['index/US.json'].find((r:any)=>r.id===id).lg='https://example.com/logo.png';}
 expect(()=>compareCoverage(measure(old),measure(next),baseline,{version:1,approvals:[{baseline,metric:'logos',ids,reason:'Reviewed',evidence:['https://example.com/review']}]})).not.toThrow();
});
it('counts missing or corrupt approved image bytes as a logo regression',async()=>{
 const {createHash}=await import('node:crypto'),bytes=Buffer.from('approved image bytes'),asset=createHash('sha256').update(bytes).digest('hex');
 const old=archive(1),id='C0.US',src=`/api/value/logo?asset=${asset}`;
 old['dossiers/000.json'][id].company.logo=src;old['index/US.json'][0].lg=src;old[`logos/${asset}.json`]={data:bytes.toString('base64')};
 for(const missing of [true,false]){const next=structuredClone(old);if(missing)delete next[`logos/${asset}.json`];else next[`logos/${asset}.json`].data=Buffer.from('corrupt').toString('base64');expect(()=>compareCoverage(measure(old),measure(next),baseline)).toThrow(/logos.*C0.US/);}
});
it('protects a published dossier logo even when its index logo was already missing',()=>{
 const old=archive(1),next=structuredClone(old);
 old['dossiers/000.json']['C0.US'].company.logo='https://example.com/logo.png';
 expect(()=>compareCoverage(measure(old),measure(next),baseline)).toThrow(/logos.*C0.US/);
});
it('allows normal removal from a filtered index when surviving company logos remain intact',()=>{
 const old=archive(1);old['dossiers/000.json']['C0.US'].company.logo=old['index/US.json'][0].lg='https://example.com/logo.png';old['index/default.json']=structuredClone(old['index/US.json']);
 const next=structuredClone(old);next['index/default.json']=[];
 expect(()=>compareCoverage(measure(old),measure(next),baseline)).not.toThrow();
});
