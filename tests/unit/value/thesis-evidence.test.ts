import { describe, expect, it } from 'vitest';
import { evidenceBatches, readBatch, combineAnswers, verifyAnswers, readThesis } from '@/lib/value/thesis/evidence';
import { THESIS_QUESTIONS } from '@/lib/value/thesis/questions';
it('retains a separate claimed exposure when an earlier passage only states defence costs',async()=>{
 const source={url:'https://example.com/interim',filed:'2026-07-31',period:'2026-06-30',section:'notes'};
 const sources=[{...source,text:'We expect legal defence costs of £7 million.'},{...source,text:'A collective proceedings claim seeks damages of £1.56 billion.'}];
 const result=await readThesis(sources,'2026-10-01','',async({questions})=>({answers:Object.fromEntries(Object.keys(questions).map(id=>[id,choice(id.endsWith('_evidence')?'p1':id==='thesis_liability'?'yes':'no')]))}));
 expect(result.answers.filter(a=>a.id==='thesis_liability'&&a.value==='yes').map(a=>a.evidence?.quote)).toEqual(sources.map(s=>s.text));
});
import { disclosureWindows } from '@/lib/value/thesis/sources';
import type { RawAnswer } from '@/lib/value/types';
const source={url:'https://example.com/report',filed:'2026-09-01',period:'2026-06-30',section:'interim',text:'We have suspended the ordinary dividend. Equity is £100 million. The redress provision is £30 million.'};
const choice=(value:string):RawAnswer=>({type:'choice',choice:value,probabilities:{[value]:1},confidence:1});
describe('source-bound thesis extraction',()=>{
 it('keeps unicode requests within the actual JSON body limit',()=>{
  for(const b of evidenceBatches([{...source,text:'訴訟と引当金。'.repeat(10000)}],'2026-10-01','Equity GBP 100 million')){
   expect(Buffer.byteLength(JSON.stringify({model:'jev-latest',state:b.state,questions:b.questions}))).toBeLessThanOrEqual(32000);
  }
 });
 it('copies selected source text exactly and never invents a quote',()=>{
  const b=evidenceBatches([source],'2026-10-01','')[0];
  const raw=Object.fromEntries(Object.keys(THESIS_QUESTIONS).flatMap(id=>[[id,choice('yes')],[`${id}_evidence`,choice('p1')]]));
  expect(readBatch(b,raw).every(a=>a.evidence?.quote===source.text)).toBe(true);
  raw.thesis_distress_evidence=choice('invented');
  expect(readBatch(b,raw).find(a=>a.id==='thesis_distress')?.evidence).toBeNull();
  expect(combineAnswers([readBatch(b,raw)]).find(a=>a.id==='thesis_distress')?.value).toBe('unclear');
 });
 it('finds disclosures beyond the reports stage note truncation',()=>{
  const text='ordinary accounting policy. '.repeat(5000)+'The motor finance redress provision is £300 million.';
  expect(disclosureWindows(text)).toContain('The motor finance redress provision is £300 million.');
 });
 it('keeps the preceding insurance-reserve qualification when a later amount is selected',()=>{
  const text='Routine insurance disputes are included in technical insurance reserves. '+('Ordinary claims. '.repeat(90))+'Total disputed liabilities PLN 12,718 million.';
  const batch=evidenceBatches([{...source,text}],'2026-10-01','')[0];
  const raw=Object.fromEntries(Object.keys(THESIS_QUESTIONS).flatMap(id=>[[id,choice('yes')],[`${id}_evidence`,choice('p2')]]));
  const evidence=readBatch(batch,raw).find(a=>a.id==='thesis_liability')!.evidence!;
  expect(evidence.quote).toContain('technical insurance reserves');expect(evidence.quote).toContain('12,718 million');expect(text.includes(evidence.quote)).toBe(true);
 });
});

import {isRecentInterim} from '@/lib/value/thesis/discover';
it('rejects old annual filings mentioning interim accounts during ESEF discovery',()=>{
 expect(isRecentInterim('Annual Report 2025. Interim financial reports','2025-12-31',null,'2026-10-01')).toBe(false);
 expect(isRecentInterim('Interim financial report','2021-12-31',null,'2026-10-01')).toBe(false);
 expect(isRecentInterim('Half-year report 2026','2026-06-30','2025-12-31','2026-10-01')).toBe(true);
 expect(isRecentInterim('Half-year report 2026','2026-06-30','2026-07-31','2026-10-01')).toBe(false);
});

it('does not act on a quote that fails confirmation or a stale filing',async()=>{
 const answers:any[]=[{id:'thesis_liability',version:'2',value:'yes',evidence:{quote:'Total liabilities $285 billion. Commitments and contingencies.',url:source.url,filed:'2025-10-31',section:'notes'}}];
 const calls=await verifyAnswers(answers,'2026-10-01','',async()=>({answers:{thesis_liability:choice('no')}}));
 expect(calls).toHaveLength(1);expect(answers[0].value).toBe('unclear');
 answers[0].value='yes';answers[0].evidence.filed='2008-05-09';
 await verifyAnswers(answers,'2026-10-01','',async()=>{throw new Error('Must not query an obsolete filing');});
 expect(answers[0].value).toBe('unclear');
});

it('never presents a join between separate filing windows as one verbatim quote',()=>{
 const [batch]=evidenceBatches([{...source,text:'First disclosure.\n\n[Noncontiguous filing excerpt]\n\nSeparate disclosure.'}],'2026-10-01','');
 expect(Object.values(batch.passages)).toEqual(['First disclosure.','Separate disclosure.']);
});
