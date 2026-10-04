import {expect,it} from 'vitest';
import {correctAnnualSources,correctCachedAnnualSources} from '@/lib/value/annual-source-corrections';
import {emptyYear} from '@/lib/value/completeness/second-sources';
const row=(val:number,extra={})=>({start:'2025-01-01',end:'2025-12-31',val,filed:'2026-02-11',form:'10-K',accn:'test',...extra});
const facts=(tags:Record<string,unknown>)=>({facts:{'us-gaap':tags}} as any);
const year=()=>({...emptyYear('2025-12-31','USD'),revenue:2889,dilutedShares:512.1});
it('uses consolidated financial revenue instead of an investment-income component',()=>{
 const [y]=correctAnnualSources([year()],facts({Revenues:{units:{USD:[row(18481)]}},RevenueFromContractWithCustomerExcludingAssessedTax:{units:{USD:[row(510)]}}}),{financial:true,source:'https://data.sec.gov/test'});
 expect(y.revenue).toBe(18481);expect(y.provenance?.revenue?.field).toBe('us-gaap:Revenues');
});
it('replaces a calendar-share proxy with fiscal weighted diluted shares, never a quarterly count',()=>{
 const [y]=correctAnnualSources([year()],facts({WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[row(539.3),row(454.2,{start:'2025-10-01'})]}}}),{source:'https://data.sec.gov/test'});
 expect(y.dilutedShares).toBe(539.3);expect(y.provenance?.dilutedShares?.method).toBe('reported');
});
it('requires an evidenced ADS ratio before converting ordinary share facts',()=>{
 const f=facts({WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[row(1334237985)]}}});
 expect(correctAnnualSources([year()],f,{source:'https://data.sec.gov/test',adr:true})[0].dilutedShares).toBe(512.1);
 const [y]=correctAnnualSources([year()],f,{source:'https://data.sec.gov/test',adr:true,ordinaryPerAds:5,shareBasisSource:'https://issuer.test/20-f'});
 expect(y.dilutedShares).toBe(266847597);expect(y.provenance?.dilutedShares?.inputs).toContain('5 ordinary shares per ADS; https://issuer.test/20-f');
});
it('does not overwrite unrelated operating revenues, currencies or periods',()=>{
 const f=facts({Revenues:{units:{USD:[row(18481)],EUR:[row(22222)]}},WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[row(999,{end:'2024-12-31',start:'2024-01-01'})]}}});
 const [y]=correctAnnualSources([year()],f,{source:'https://data.sec.gov/test'});expect(y.revenue).toBe(2889);expect(y.dilutedShares).toBe(512.1);
});
it('uses bank net interest plus noninterest revenue without adding gross interest twice',()=>{
 const f=facts({InterestIncomeExpenseNet:{units:{USD:[row(172499)]}},NoninterestIncome:{units:{USD:[row(51876)]}},InterestAndDividendIncomeOperating:{units:{USD:[row(279636)]}}});
 const [y]=correctAnnualSources([year()],f,{source:'https://data.sec.gov/test',financial:true});expect(y.revenue).toBe(224375);expect(y.netRevenue).toBe(224375);
});
it('rejects conflicting facts at the same reporting date instead of picking an arbitrary value',()=>{
 const [y]=correctAnnualSources([year()],facts({WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[row(539.3),row(23)]}}}),{source:'https://data.sec.gov/test'});expect(y.dilutedShares).toBe(512.1);
});
it('uses corroborated full-scale revenue when an alternate SEC tag omits the thousand scale',()=>{
 const y={...year(),revenue:13199785000};const f=facts({Revenues:{units:{USD:[row(13569483)]}},RevenueFromContractWithCustomerExcludingAssessedTax:{units:{USD:[row(13569483000)]}}});
 expect(correctAnnualSources([y],f,{source:'https://data.sec.gov/test',financial:true})[0].revenue).toBe(13569483000);
});
it('reads diluted partnership units as shares of the listed unit',()=>{
 const [y]=correctAnnualSources([year()],facts({WeightedAverageLimitedPartnershipUnitsOutstandingDiluted:{units:{shares:[row(137198218)]}}}),{source:'https://data.sec.gov/test'});expect(y.dilutedShares).toBe(137198218);
});
it('uses IFRS basic weighted shares only when reported basic and diluted EPS are equal',()=>{
 const f={facts:{'ifrs-full':{WeightedAverageShares:{units:{shares:[row(30893300)]}},BasicEarningsLossPerShare:{units:{'USD/shares':[row(32.17)]}},DilutedEarningsLossPerShare:{units:{'USD/shares':[row(32.17)]}}}}};
 expect(correctAnnualSources([year()],f,{source:'https://data.sec.gov/test'})[0].dilutedShares).toBe(30893300);
});
it('converts pre-split annual shares to current listing units exactly once',()=>{
 const f=facts({WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[row(12167000)]}}});
 const options={source:'https://data.sec.gov/test',splits:[{date:'2026-04-06',factor:3}]};
 const once=correctAnnualSources([year()],f,options);expect(once[0].dilutedShares).toBe(36501000);expect(correctAnnualSources(once,f,options)[0].dilutedShares).toBe(36501000);
});
it('aligns a rounded vendor end only with an independently matching annual total',()=>{
 const f=facts({Revenues:{units:{USD:[row(2889,{end:'2025-12-28'})]}},WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[row(121.2,{end:'2025-12-28'})]}}});
 expect(correctAnnualSources([year()],f,{source:'https://data.sec.gov/test'})[0].dilutedShares).toBe(121.2);
 expect(correctAnnualSources([{...year(),revenue:1}],f,{source:'https://data.sec.gov/test'})[0].dilutedShares).toBe(512.1);
});
it('uses a reviewed consolidated extension concept without substituting insurance premiums alone',()=>{
 const f={facts:{'ifrs-full':{InsuranceRevenue:{units:{EUR:[row(9097)]}}},issuer:{ConsolidatedRevenue:{units:{EUR:[row(17664)]}}}}};
 const options={source:'https://issuer.test/annual',financial:true,revenueConcept:'issuer:ConsolidatedRevenue'};
 expect(correctAnnualSources([{...year(),currency:'EUR',revenue:26864}],f,options)[0].revenue).toBe(17664);
});
it('uses total investment income including paid-in-kind income for investment companies',()=>{
 const f=facts({GrossInvestmentIncomeOperating:{units:{USD:[row(279210000)]}}});
 expect(correctAnnualSources([year()],f,{source:'https://sec.gov/test',financial:true})[0].revenue).toBe(279210000);
});
it('corrects a currency label only when two independent annual/instant values corroborate the alternative',()=>{
 const y={...year(),totalAssets:267338680000,netIncome:6925377000};
 const f={facts:{'ifrs-full':{Assets:{units:{PEN:[row(267362533000,{start:undefined})]}},ProfitLossAttributableToOwnersOfParent:{units:{PEN:[row(6925377000)]}},Revenue:{units:{PEN:[row(28555000000)]}}}}};
 const [fixed]=correctAnnualSources([y],f,{source:'https://sec.gov/test',financial:true});
 expect(fixed.currency).toBe('PEN');expect(fixed.revenue).toBe(28555000000);
 expect(correctAnnualSources([{...y,totalAssets:100}],f,{source:'https://sec.gov/test',financial:true})[0].currency).toBe('USD');
});
it('prefers total IFRS revenue and income over fee revenue alone',()=>{
 const f={facts:{'ifrs-full':{Revenue:{units:{USD:[row(7966733)]}},RevenueAndOperatingIncome:{units:{USD:[row(18398597)]}}}}};
 expect(correctAnnualSources([year()],f,{source:'https://sec.gov/test',financial:true})[0].revenue).toBe(18398597);
});
it('sums reviewed financial revenue components only when every component covers the same period',()=>{
 const f=facts({NetInterest:{units:{USD:[row(10)]}},OtherIncome:{units:{USD:[row(4)]}}});
 const opts={source:'https://issuer.test/annual',financial:true,revenueComponents:['us-gaap:NetInterest','us-gaap:OtherIncome']};
 expect(correctAnnualSources([year()],f,opts)[0].revenue).toBe(14);
 expect(correctAnnualSources([year()],f,{...opts,revenueComponents:[...opts.revenueComponents,'us-gaap:Missing']})[0].revenue).toBe(2889);
});
it('does not replace older same-basis inputs with an undimensioned alternative accounting basis',()=>{
 const company={id:'EXAMPLE.US',cik:'123',sector:'Financial Services',kind:'bank'} as any;
 const cache:Record<string,unknown>={
  'raw/sec-companyfacts/EXAMPLE.US.json':facts({Revenues:{units:{USD:[row(999)]}}}),
  'raw/sec-annual/EXAMPLE.US.json':{facts:{facts:{}},source:'https://sec.gov/annual',revenueDimensions:{'issuer:BasisAxis':'issuer:LocalBasisMember'}},
 };
 const [y]=correctCachedAnnualSources(company,[year()],null,<T>(file:string)=>cache[file] as T??null);
 expect(y.revenue).toBe(2889);
});
it('repairs a vendor fiscal-year shift only with three exact independent statement anchors',()=>{
 const y={...year(),end:'2026-06-30',fy:2026,netIncome:20287000,totalAssets:2150684000,equity:323861000,ocf:11117000};
 const f=facts({NetIncomeLoss:{units:{USD:[row(y.netIncome)]}},Assets:{units:{USD:[row(y.totalAssets,{start:undefined})]}},StockholdersEquity:{units:{USD:[row(y.equity,{start:undefined})]}},InterestIncomeExpenseNet:{units:{USD:[row(79148000)]}},NoninterestIncome:{units:{USD:[row(17140000)]}}});
 const corrected=correctAnnualSources([{...year(),end:'2025-06-30',fy:2025},y],f,{source:'https://sec.gov/annual',financial:true});
 expect(corrected).toHaveLength(1);expect(corrected[0].end).toBe('2025-12-31');expect(corrected[0].fy).toBe(2025);expect(corrected[0].revenue).toBe(96288000);
 expect(correctAnnualSources([...corrected,y],f,{source:'https://sec.gov/annual',financial:true})).toHaveLength(1);
 expect(correctAnnualSources([{...y,equity:1}],f,{source:'https://sec.gov/annual',financial:true})[0].end).toBe('2026-06-30');
});
