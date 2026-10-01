import {expect,it} from 'vitest';
import {applyReportedFacts} from '@/lib/value/completeness/reported-facts';
import {emptyYear} from '@/lib/value/completeness/second-sources';
it('adds issuer-reported NAV with its source quote and a declared split adjustment',()=>{
 const ys=applyReportedFacts([emptyYear('2020-12-31','SEK')],[{end:'2020-12-31',currency:'SEK',source:'https://issuer.example/report',quote:'NAV per share 400 SEK',values:{navPerShare:400},splitFactor:4}]);
 expect(ys[0].navPerShare).toBe(100);
 expect(ys[0].provenance?.navPerShare?.inputs).toContain('NAV per share 400 SEK');
});
it('rejects unquoted facts, a currency mismatch and invalid split factors',()=>{
 const y=emptyYear('2020-12-31','SEK');
 const f={end:y.end,currency:'SEK',source:'https://issuer.example/report',quote:'NAV 400',values:{navPerShare:400}};
 expect(()=>applyReportedFacts([y],[{...f,quote:''}])).toThrow();
 expect(()=>applyReportedFacts([y],[{...f,currency:'EUR'}])).toThrow();
 expect(()=>applyReportedFacts([y],[{...f,splitFactor:0}])).toThrow();
});
it('retains existing statement values and applies per-share adjustment only to per-share fields',()=>{
 const y={...emptyYear('2020-12-31','SEK'),netIncome:20};
 const result=applyReportedFacts([y],[{end:y.end,currency:'SEK',source:'https://issuer.example/report',quote:'NAV 400, dividend 4, profit 30',values:{navPerShare:400,dividendsPerShare:4,netIncome:30},splitFactor:4}]);
 expect(result[0]).toMatchObject({navPerShare:100,dividendsPerShare:1,netIncome:20});
});
it('requires an explicit correction to replace a mislabeled currency and coherent issuer balance',()=>{
 const y={...emptyYear('2020-12-31','GBX'),netIncome:1138,totalAssets:216965,equity:0};
 const f={end:y.end,currency:'GBP',source:'https://issuer.example/report',quote:'2020 £m: assets 228726; parent equity 5577; liabilities 223141; minorities 8',values:{totalAssets:228726,equity:5577,totalLiabilities:223141,minorityInterest:8},correction:true};
 expect(applyReportedFacts([y],[f])[0]).toMatchObject({...f.values,currency:'GBP',netIncome:1138});
});
it('records an absent goodwill line only for a reviewed complete statement',()=>{
 const f={end:'2022-03-31',currency:'INR',source:'https://issuer.example/report',quote:'Complete consolidated balance sheet: no goodwill line.',values:{goodwill:0},absenceInCompleteStatement:true};
 expect(applyReportedFacts([], [f])[0].provenance?.goodwill?.method).toBe('absent-in-complete-statement');
 expect(()=>applyReportedFacts([], [{...f,values:{goodwill:1}}])).toThrow();
});
it('preserves a sourced unit conversion through repeated derivation',async()=>{
 const {deriveYears}=await import('@/lib/value/derive');
 const y={...emptyYear('2025-12-31','NZD'),grossProfit:200000,operatingExpenses:199000};
 const facts=[{end:y.end,currency:'NZD',source:'https://issuer.example/annual-report',quote:'Operating profit 61',values:{operatingIncome:61000},calculation:'NZ$000 multiplied by 1000',correction:true}];
 const corrected=applyReportedFacts([y],facts);
 expect(deriveYears(deriveYears(corrected))[0].operatingIncome).toBe(61000);
 expect(deriveYears(corrected)[0].provenance?.operatingIncome?.source).toBe(facts[0].source);
});
it('joins a reviewed annual total to its uniquely matching week-based provider year',()=>{
 const y={...emptyYear('2025-12-31','USD'),revenue:24942e6,netIncome:-5846e6,dilutedShares:1187e6};
 const fact={end:'2025-12-27',currency:'USD',source:'https://issuer.example/annual',quote:'Net sales 24,942 million, year ended December 27, 2025.',values:{revenue:24942e6},correction:true};
 const result=applyReportedFacts([y],[fact]);
 expect(result).toHaveLength(1);expect(result[0]).toMatchObject({end:'2025-12-27',netIncome:-5846e6,dilutedShares:1187e6});
 expect(applyReportedFacts(result,[fact])).toEqual(result);
 expect(applyReportedFacts([{...y,revenue:1}],[fact])).toHaveLength(2);
 expect(applyReportedFacts([y,{...y,end:'2025-12-30'}],[fact])).toHaveLength(3);
});
