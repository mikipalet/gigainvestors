import {it,expect} from 'vitest';
import {numericMemo,memoAtPrice} from '../../../lib/value/owner-memo';
import {modelValue,valuationReturnModel} from '../../../lib/value/return-model';
import {factsFromVendor} from '../../../lib/value/business/memo-facts';
import {validMemoAnswer,consistentMemoLines} from '../../../lib/value/business/memo-validation';
import type {Analysis,Valuation} from '../../../lib/value/types';
const v={method:'owner_earnings',normalized:100,shares:10,netCash:20,growth:.263,terminalGrowth:.03,discountRate:.1,tier:'compounder',currency:'USD'} as Valuation;
const a={id:'KO.US',company:{kind:'operating',currency:'USD'},valuation:v,tests:{},series:{}} as unknown as Analysis;
it('compares the price-implied ten-year compound average, including fade',()=>{
 const model=valuationReturnModel(v)!,price=modelValue(model,v.discountRate);
 const average=(model.annual[9]/(v.normalized/v.shares))**.1-1;
 const line=numericMemo(a,[],price).find(l=>l.question===7)!;
 expect(line.answer).toContain(`${Number((average*100).toFixed(1))}%`);
 expect(line.answer).not.toContain('26.3%');
 expect(line.answer).toContain('ten years');
});
it('does not mistake a matching institutional block for management ownership',()=>{
 expect(factsFromVendor({SharesStats:{PercentInsiders:9.9},Holders:{Institutions:{0:{name:'Berkshire Hathaway Inc',totalShares:9.3}}}},'OTHER.US','2026-10-02').insiderPercent).toBeUndefined();
 expect(factsFromVendor({SharesStats:{PercentInsiders:.2},Holders:{Institutions:{0:{name:'BlackRock',totalShares:9.3}}}},'OTHER.US','2026-10-02').insiderPercent).toBe(.2);
});
it('uses KO officer/director disclosure when publishing an older provider memo',()=>{
 const old={question:5,answer:'Insiders own 9.9% of the company.',basis:'computed' as const,evidence:[{url:'https://eodhd.com',filed:'2026',section:'Ownership',quote:'9.9%'}]};
 const memo=memoAtPrice({...a,ownerMemo:{version:1,asOf:'2026',inputHash:'x',lines:[old]}},[80,'2026-10-02']);
 expect(memo?.lines.find(l=>l.question===5)?.answer).toBe('Directors and executive officers own less than 1% of the company.');
});
it.each(['For example,','However,','Furthermore,','In addition,'])('rejects a risk line beginning with %s',connector=>{
 expect(validMemoAnswer(`${connector} European data transfers are highly regulated and litigated.`)).toBe(false);
});
it('keeps the complete risk statement while removing its leading connector',()=>{
 const answer='For example, European data transfers outside the European Economic Area are highly regulated and litigated.';
 expect(consistentMemoLines(a,[{question:6,answer,basis:'filing',evidence:[{url:'https://adobe.com',filed:'2026',section:'Risk',quote:answer}]}])[0]?.answer).toBe('European data transfers outside the European Economic Area are highly regulated and litigated.');
});
