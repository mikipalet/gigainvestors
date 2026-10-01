import { expect, it } from 'vitest';
import { thesisFingerprint, thesisNeedsRefresh, isThesisCandidate } from '@/lib/value/thesis/refresh';
import { applyThesis } from '@/lib/value/thesis/apply';
import { THESIS_VERSION } from '@/lib/value/thesis/questions';
it('limits daily reading to buy and next-closest candidates',()=>{
 expect(isThesisCandidate(['drawdown','financial_charges'])).toBe(false);
 expect(isThesisCandidate(['buy'])).toBe(true);
 expect(isThesisCandidate(['next_closest'])).toBe(true);
});
it('refreshes changed inputs, missing results and results older than 30 days',()=>{
 const prior:any={version:THESIS_VERSION,asOf:'2026-09-01',fingerprint:'same'};
 expect(thesisNeedsRefresh(prior,'same','2026-10-01')).toBe(false);
 expect(thesisNeedsRefresh(prior,'same','2026-10-02')).toBe(true);
 expect(thesisNeedsRefresh(prior,'changed','2026-10-01')).toBe(true);
 expect(thesisNeedsRefresh(null,'same','2026-10-01')).toBe(true);
 expect(thesisFingerprint({sources:['filing'],context:'earnings 100'})).toBe(thesisFingerprint({sources:['filing'],context:'earnings 100'}));
});
it('keeps a current thesis exclusion across daily analysis refreshes',()=>{
 const a:any={id:'TEST.US',asOf:'2026-10-01',valuation:null};
 const r:any={id:a.id,version:THESIS_VERSION,asOf:'2026-09-30',answers:[{id:'thesis_distress',version:THESIS_VERSION,value:'yes',evidence:{quote:'We suspended the dividend.',url:'https://example.com/filing',filed:'2026-09-30',section:'interim'}}]};
 const trust:any={thesis_distress:{version:THESIS_VERSION,accuracy:1,n:10,positives:5,negatives:5}};
 expect(applyThesis(a,r,trust).thesis?.changed).toBe(true);
 expect(applyThesis({...a,asOf:'2026-11-01'},r,trust).thesis?.changed).toBe(true);
});
it('requires priced quality candidates and recomputes buy status after a quote move', async()=>{
 const {thesisZone}=await import('@/lib/value/thesis/refresh');
 const row:any={st:'s',t:'PPPPP',v:[80,100,120],m:.25,b:true,buyReturnInputs:{cashPerShare:8,growth:.02,requiredReturn:.1},shareSources:2};
 expect(thesisZone(row,[70,'2026-10-01'])).toBe('buy');
 expect(thesisZone(row,[90,'2026-10-01'])).toBe('next_closest');
 expect(thesisZone({...row,t:'FPPPP'},[70,'2026-10-01'])).toBeNull();
 expect(thesisZone(row,undefined)).toBeNull();
});
