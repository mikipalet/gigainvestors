import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import records from '../../fixtures/value/thesis/production-v2.json';
import {extractAmounts} from '@/lib/value/thesis/amounts';
import {applyThesis} from '@/lib/value/thesis/apply';
import {buildOutput} from '@/lib/value/build-output';
import {browserRow,packView,unpackView} from '@/lib/value/browser-view';
import {publishedBuyPrice} from '@/lib/value/buy-price';
import {DossierContent} from '@/components/value/DossierContent';
import type {RawAnswer,Year} from '@/lib/value/types';
import type {ThesisAnswer,ThesisResult} from '@/lib/value/thesis/types';

describe('controller audit production recordings',()=>{
 for(const r of records)it(`replays ${r.id} exposure selection from actual Jev responses`,async()=>{
  const answers=structuredClone(r.before) as ThesisAnswer[];
  await extractAmounts(answers,r.currency,r.latest as unknown as Year,async({state,questions})=>{
   const hash=createHash('sha256').update(state).digest('hex');
   const call=r.calls.find(c=>c.stateHash===hash&&JSON.stringify(c.questions)===JSON.stringify(questions));
   expect(call).toBeDefined();return {answers:call!.answers as Record<string,RawAnswer>};
  });
  expect(answers).toEqual(r.after);
 });
 it('removes the asserted Rightmove claim from Buy now while retaining valuation and claim wording everywhere',()=>{
  const r=records.find(r=>r.id==='RMV.LSE')!;
  const a=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'];
  a.id=r.id;a.asOf=r.result.asOf;a.company={...a.company,id:a.id,country:'GB',currency:'GBP',marketCapUsd:null};
  a.valuation={...a.valuation,currency:'GBP',normalized:1000,shares:100,netCash:0,terminalGrowth:0,growth:0,discountRate:.1,perShare:{low:80,mid:100,high:120},perShareTrading:undefined,assumptions:[]};
  const result={...r.result,answers:r.after} as unknown as ThesisResult;
  const changed=applyThesis(a,result);
  expect(changed.valuation).toBe(a.valuation);expect(changed.tests).toBe(a.tests);
  expect(changed.thesis?.reason).toBe('Collective proceedings claim: £1.56bn claimed (Nov 2025)');
  expect(changed.thesis?.evidence.some(e=>e.quote.includes('£1.56 billion')&&e.url.includes('rightmove'))).toBe(true);
  const args={prices:{[a.id]:[60,'2026-09-30'] as [number,string]},holdersByTicker:{},investorNames:{},fx:{GBP:1.3}};
  const base=buildOutput({...args,analyses:[a]}).files;
  const files=buildOutput({...args,analyses:[changed]}).files;
  const baseline=(base['index/default.json'] as any[])[0],row=(files['index/default.json'] as any[])[0];
  expect(baseline.b).toBe(true);expect(row.b).toBe(false);expect(row.v).toEqual(baseline.v);
  expect(unpackView(packView([browserRow(row)]))[0].thesisReason).toContain('£1.56bn claimed');
  expect(publishedBuyPrice(row,[20,'2026-10-01']).b).toBe(false);
  const dossier=Object.entries(files).filter(([k])=>k.startsWith('dossiers/')).flatMap(([,v])=>Object.values(v as object))[0] as any;
  const html=renderToStaticMarkup(createElement(DossierContent,{dossier,quote:[60,'2026-09-30']}));
  expect(html).toContain('£1.56bn claimed');expect(html).toContain('48.1% of market value');
  expect(html).toContain('8.1 years of owner earnings');expect(html).toContain('Read the disclosure');
  expect(html).not.toContain('Business changed');expect(html).not.toContain('data-verdict="Buy zone"');
 });
 it('restores USB, Zoetis and PZU eligibility and includes the exact CBG dividend disclosure',()=>{
  for(const id of ['USB.US','ZTS.US','PZU.WAR']){
   const r=records.find(r=>r.id===id)!;const a:any={id,asOf:r.result.asOf,valuation:null,tests:{}};
   expect(applyThesis(a,{...r.result,answers:r.after} as unknown as ThesisResult)).toBe(a);
  }
  const r=records.find(r=>r.id==='CBG.LSE')!;const a:any={id:r.id,asOf:r.result.asOf,valuation:null,tests:{}};
  const revised=applyThesis(a,{...r.result,answers:r.after} as unknown as ThesisResult);
  expect(revised.thesis?.reason).toBe('Motor-finance redress: £320m provided; final dividend withheld');
  expect(revised.thesis?.evidence.some(e=>e.quote.includes('will not pay a final dividend'))).toBe(true);
 });
});
