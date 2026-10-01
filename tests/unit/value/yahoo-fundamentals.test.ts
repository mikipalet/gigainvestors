import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { normalizeYahooFundamentals } from '@/lib/value/fundamentals-yahoo';
import { yahooSymbol } from '@/lib/value/price-history';
import type { Company } from '@/lib/value/types';
const company={id:'RELIANCE.NSE',code:'RELIANCE',exchange:'NSE',currency:'INR',source:'eodhd'} as Company;
const recorded=()=>JSON.parse(readFileSync('tests/fixtures/value/ops/yahoo-reliance-annual.json','utf8'));
it('maps recorded annual INR statements with Yahoo provenance and unchanged history requirements',()=>{
 const f=normalizeYahooFundamentals(recorded(),company);
 expect(yahooSymbol(company)).toBe('RELIANCE.NS');
 expect(f.currency).toBe('INR');expect(f.years).toHaveLength(4);
 expect(f.years[0]).toMatchObject({end:'2023-03-31',revenue:8778350000000,sbc:null,goodwill:null,statementCoverage:{income:false,balance:false,cashFlow:false}});
 expect(f.years[0].provenance?.revenue).toMatchObject({source:'raw/yahoo-fundamentals/RELIANCE.NSE.json#2023-03-31',field:'annualTotalRevenue',method:'reported'});
 expect(f.integrity.ok).toBe(false);expect(f.integrity.reasons).toContain('fewer than 7 annual periods');
 expect(f.years.every(y=>y.capex===null||y.capex>=0)).toBe(true);
});
it('ignores quarterly, malformed, null and mismatched-symbol observations',()=>{
 const raw=recorded();const series=raw.timeseries.result.find((s:any)=>s.meta.type[0]==='annualTotalRevenue');
 series.annualTotalRevenue.push({...series.annualTotalRevenue[0],asOfDate:'2022-03-31',periodType:'3M'},{...series.annualTotalRevenue[0],asOfDate:'2022-02-30'}, {...series.annualTotalRevenue[0],asOfDate:'2021-03-31',reportedValue:{raw:null}});
 const f=normalizeYahooFundamentals(raw,company);expect(f.years).toHaveLength(4);
 series.meta.symbol=['OTHER.NS'];expect(()=>normalizeYahooFundamentals(raw,company)).toThrow('symbol');
});
it('rejects unavailable data and conflicting currencies within a period',()=>{
 expect(()=>normalizeYahooFundamentals({timeseries:{result:[],error:null}},company)).toThrow('annual');
 const raw=recorded();raw.timeseries.result.find((s:any)=>s.meta.type[0]==='annualTotalRevenue').annualTotalRevenue[0].currencyCode='USD';
 expect(()=>normalizeYahooFundamentals(raw,company)).toThrow('currency');
});
