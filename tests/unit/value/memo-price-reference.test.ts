import {it,expect} from 'vitest';
import {numericMemo} from '../../../lib/value/owner-memo';
import type {Analysis} from '../../../lib/value/types';
const evidence={url:'https://query1.finance.yahoo.com/v8/finance/chart/TEST',filed:'2026-10-01',section:'Market prices',quote:'52-week high 100 USD.'};
const a={company:{currency:'USD',kind:'operating'},tests:{},series:{},valuation:null,ownerMemo:{version:1,asOf:'2026-10-01',inputHash:'x',lines:[],priceReference:{value:100,currency:'USD',asOf:'2026-10-01',evidence}}} as unknown as Analysis;
it('uses a dated price comparison when financial denominators do not exist',()=>{
 expect(numericMemo(a,[],80).find(l=>l.question===7)?.answer).toBe('The price is 20% below its 52-week high.');
 expect(numericMemo({...a,company:{...a.company,currency:'EUR'}},[],80).find(l=>l.question===7)).toBeUndefined();
});
it('uses current book equity rather than a stale or implausible sales multiple',()=>{
 const b:Analysis={...a,reportingCurrency:'USD',series:{revenuePerShare:[[2024,.001]],bookValuePerShare:[[2025,10]]}};
 expect(numericMemo(b,[],80).find(l=>l.question===7)?.answer).toBe('The price is 8 times net assets.');
});
