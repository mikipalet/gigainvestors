import {expect,it} from 'vitest';
import {emptyYear} from '@/lib/value/completeness/second-sources';
import {translatePresentationCurrency} from '@/lib/value/completeness/presentation-currency';
import {completeCachedYears} from '@/lib/value/completeness/cached-years';
it('translates older primary filings before merging a later presentation currency',()=>{
 const old={...emptyYear('2020-12-31','DKK'),netIncome:70,totalAssets:700,dilutedShares:10};
 const recent={...emptyYear('2021-12-31','EUR'),netIncome:12,totalAssets:120,dilutedShares:10};
 const rate={from:'DKK',to:'EUR',end:old.end,average:1/7,closing:1/7,source:'https://example.com/dated-fx'};
 const cache:Record<string,unknown>={
  'completeness/verified/TEST.CO.json':{id:'TEST.CO',fundamentals:{years:[recent]},currencyTranslations:[rate]},
  'completeness/issuer-years/TEST.CO.json':[old,recent],
 };
 const result=completeCachedYears({id:'TEST.CO',source:'eodhd',cik:null},[recent],<T>(path:string)=>cache[path] as T??null);
 expect(result).toHaveLength(2);
 expect(result[0]).toMatchObject({currency:'EUR',netIncome:10,totalAssets:100,dilutedShares:10});
 expect(old.currency).toBe('DKK');
});
it('translates flows and stocks at their respective rates without changing shares or ratios',()=>{
 const y={...emptyYear('2020-12-31','GBP'),netIncome:10,totalAssets:100,equity:38,minorityInterest:2,totalLiabilities:60,dilutedShares:5,combinedRatio:.9};
 const rate={from:'GBP',to:'USD',end:y.end,average:1.3,closing:1.4,source:'https://example.com/dated-fx'};
 const [r]=translatePresentationCurrency([y],[rate]);
 expect(r).toMatchObject({netIncome:13,totalAssets:140,equity:53.199999999999996,minorityInterest:2.8,totalLiabilities:84,dilutedShares:5,combinedRatio:.9,currency:'USD'});
 expect(y.currency).toBe('GBP');expect(r.provenance?.netIncome.inputs).toContain('Annual-average GBP/USD: 1.3');
 expect(translatePresentationCurrency([y],[{...rate,end:'2019-12-31'}])[0]).toEqual(y);
 expect(()=>translatePresentationCurrency([y],[{...rate,average:0}])).toThrow();
});

it('restores SEC history stored with its zero-padded CIK',()=>{
 const y={...emptyYear('2019-12-31','USD'),netIncome:12};
 const cache:Record<string,unknown>={'completeness/sec/0001513845.json':[y]};
 const result=completeCachedYears({id:'NBIS.US',source:'eodhd',cik:'0001513845'},[],<T>(path:string)=>cache[path] as T??null);
 expect(result[0]?.netIncome).toBe(12);
});
