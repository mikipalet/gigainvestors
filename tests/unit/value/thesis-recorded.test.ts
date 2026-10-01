import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import labels from '../../fixtures/value/thesis/calibration.json';
import recorded from '../../fixtures/value/thesis/recorded-jev.json';
import { readThesis } from '@/lib/value/thesis/evidence';
import { applyThesis } from '@/lib/value/thesis/apply';
import { publishedBuyPrice } from '@/lib/value/buy-price';
import { mainCompanies, mainZones } from '@/lib/value/main-layout';
import type { RawAnswer } from '@/lib/value/types';

describe('recorded Jev calibration responses',()=>{
 for(const fixture of labels.cases)it(`replays exact source-bound answers for ${fixture.id}`,async()=>{
  const record=recorded.find(r=>r.id===fixture.id)!;
  const result=await readThesis(fixture.sources,fixture.asOf,fixture.context,async({state,questions})=>{
   const hash=createHash('sha256').update(state).digest('hex');
   const response=record.recordings.find(r=>r.stateHash===hash&&JSON.stringify(r.questions)===JSON.stringify(questions));
   expect(response).toBeDefined();expect(response!.questions).toEqual(questions);
   return {answers:response!.answers as Record<string,RawAnswer>};
  });
  expect(result.answers).toEqual(record.answers);
 });
 it('turns the recorded Close Brothers disclosures into a separate business-changed decision',()=>{
  const record=recorded.find(r=>r.id==='CBG-2025')!;
  const a:any={id:'CBG.LSE',asOf:'2025-09-30',valuation:null,tests:{}};
  const result:any={...record,id:a.id,asOf:a.asOf,version:'2'};
  const changed=applyThesis(a,result);
  expect(changed.thesis?.changed).toBe(true);
  expect(changed.tests).toBe(a.tests);
  expect(changed.thesis?.evidence.every(e=>e.url.startsWith('https://'))).toBe(true);
 });
 it('cannot restore an excluded company after a quote refresh, or put it in next closest',()=>{
  const row:any={id:'CBG.LSE',n:'Close Brothers',st:'s',t:'PPPPP',v:[90,100,110],m:.25,buyReturnInputs:{cashPerShare:10,growth:0,requiredReturn:.1},businessChanged:true,b:true};
  expect(publishedBuyPrice(row,[50,'2026-10-01']).b).toBe(false);
  const zones=mainZones(mainCompanies([{row,mos:.5,quote:50,expected:.2}]));
  expect(zones.buy).toHaveLength(0);expect(zones.next).toHaveLength(0);expect(zones.rest).toHaveLength(1);
 });
});

it('preserves the veto through index, browser payload, dossier and funnel publication',async()=>{
 const {readFileSync}=await import('node:fs');
 const {buildOutput}=await import('@/lib/value/build-output');
 const {browserRow,packView,unpackView}=await import('@/lib/value/browser-view');
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {DossierContent}=await import('@/components/value/DossierContent');
 const a=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'];
 a.asOf='2025-09-30T09:06:22.368Z';a.id='CBG.LSE';a.company={...a.company,id:a.id,country:'GB',currency:'GBP',marketCapUsd:null};
 a.valuation={...a.valuation,currency:'GBP',normalized:1000,shares:100,growth:0,discountRate:.1,perShare:{low:80,mid:100,high:120},perShareTrading:undefined,assumptions:[]};
 const result:any={...recorded.find(r=>r.id==='CBG-2025'),id:a.id,asOf:a.asOf.slice(0,10),version:'2'};
 const changed=applyThesis(a,result);
 const args={prices:{[a.id]:[60,'2025-09-30'] as [number,string]},holdersByTicker:{},investorNames:{},fx:{GBP:1.3}};
 const baseline=buildOutput({...args,analyses:[a]}).files,files=buildOutput({...args,analyses:[changed]}).files;
 const baselineRows=baseline['index/default.json'] as any[],rows=files['index/default.json'] as any[];
 expect(baselineRows[0].b).toBe(true);expect(rows[0]).toMatchObject({b:false,businessChanged:true,t:'PPPPP'});
 expect((files['meta.json'] as any).story.atBuy).toBe(0);
 expect(unpackView(packView([browserRow(rows[0])]))[0].businessChanged).toBe(true);
 const dossier=Object.entries(files).filter(([k])=>k.startsWith('dossiers/')).flatMap(([,v])=>Object.values(v as object))[0] as any;
 expect(dossier.thesis.evidence).toEqual(changed.thesis!.evidence);
 const html=renderToStaticMarkup(createElement(DossierContent,{dossier,quote:[60,'2025-09-30']}));
 expect(html).toContain('data-verdict="Business changed"');expect(html).toContain('Read the disclosure');expect(html).not.toContain('data-verdict="Buy zone"');
});
