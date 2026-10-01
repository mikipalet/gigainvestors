import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseIndiaXbrl, parseIndiaLegacy, parseIndiaDetail, integratedAnnualFiling, selectIndiaFilings, mergeIndiaYahoo, indiaSymbol } from '../../lib/value/india/filings';
import { emptyYear } from '../../lib/value/completeness/second-sources';
import { assertIndiaDisk, selectNiftyCompanies, indiaSplits, mergeIndiaActions } from '../../lib/value/india/importer';
import type { Company } from '../../lib/value/types';

const fixture = (name: string) => readFileSync(`tests/fixtures/value/india/${name}`);
const list = (s: string) => JSON.parse(fixture(`${s}-annual.json`).toString());
const filing = (s: string) => list(s).find((r: any) => r.consolidated === 'Consolidated');
const xml = (s: string) => gunzipSync(fixture(`${s}-2024.xml.gz`)).toString();

describe('India official filings', () => {
  it('stops below 5 GiB and scopes local symbols to canonical Nifty identities', () => {
    expect(()=>assertIndiaDisk(5*1024**3-1)).toThrow(/Disk/);
    expect(()=>assertIndiaDisk(5*1024**3)).not.toThrow();
    const companies=[{id:'INFY.US',indexes:['Nifty 50']},{id:'AAPL.US',indexes:[]}] as Company[];
    expect(selectNiftyCompanies(companies,['INFY.NSE']).map(c=>c.id)).toEqual(['INFY.US']);
    expect(()=>selectNiftyCompanies(companies,['AAPL.US'])).toThrow(/Nifty/);
  });
  it('reads annual parent profit in rupees despite quarterly context dates and crores display', () => {
    const y = parseIndiaXbrl(xml('INFY'), filing('INFY'))[0];
    expect(y.end).toBe('2024-03-31');
    expect(y.revenue).toBe(1536700000000);
    expect(y.netIncome).toBe(262330000000);
    expect(y.totalNetIncome).toBe(262480000000);
    expect(y.equity).toBe(881160000000);
    expect(y.ocf).toBe(252100000000);
    expect(y.provenance?.netIncome.field).toContain('ProfitOrLossAttributableToOwnersOfParent');
    expect(y.provenance?.netIncome.source).toBe(filing('INFY').xbrl);
  });
  it('accepts the recorded WEB exporter missing base contexts only with explicit matching period metadata', () => {
    const f=list('INFY').find((r:any)=>r.toDate==='31-Mar-2022'&&r.consolidated==='Consolidated');
    const text=gunzipSync(fixture('INFY-2022-web.xml.gz')).toString();
    expect(parseIndiaXbrl(text,f)[0].revenue).toBe(1216410000000);
    expect(()=>parseIndiaXbrl(text.replaceAll('2021-04-01','2022-01-01'),f)).toThrow(/annual/);
  });
  it('recovers the missing XBRL 2018 annual period from the official detail JSON',()=>{
    const f=list('TCS').find((r:any)=>r.toDate==='31-Mar-2018'&&r.consolidated==='Consolidated');
    const raw=JSON.parse(fixture('TCS-2018-detail.json').toString());
    const y=parseIndiaDetail(raw,f);
    expect(y.revenue).toBe(1231040000000);expect(y.netIncome).toBe(258800000000);
    expect(y.da).toBe(20140000000);expect(y.ocf).toBeNull();
    expect(()=>parseIndiaDetail({...raw,seqnum:'wrong'},f)).toThrow(/identity/);
  });
  it('uses explicit financial-year dates for a yearly banking export that omits reporting start',()=>{
    const f=list('HDFCBANK').find((r:any)=>r.toDate==='31-Mar-2023'&&r.consolidated==='Consolidated');
    expect(parseIndiaXbrl(gunzipSync(fixture('HDFCBANK-2023.xml.gz')).toString(),f)[0].interestIncome).toBeGreaterThan(0);
  });
  it('reads the new integrated annual feed without importing the fourth quarter as a year',()=>{
    const text=gunzipSync(fixture('INFY-2026-integrated.xml.gz')).toString();
    const f=integratedAnnualFiling(text,{symbol:'INFY',qe_Date:'31-MAR-2026',audited:'Audited',consolidated:'Consolidated',xbrl:'https://nsearchives.nseindia.com/corporate/xbrl/test.xml',seq_Id:'123'});
    expect(parseIndiaXbrl(text,f!)[0].revenue).toBe(1786500000000);
    expect(integratedAnnualFiling(text,{...f!,xbrl:f!.xbrl??'',qe_Date:'30-JUN-2026'})).toBeNull();
  });
  it('uses the audited annual column even when the integrated index marks Q4 unaudited',()=>{
    const text=gunzipSync(fixture('MARUTI-2025-integrated.xml.gz')).toString();
    const row=JSON.parse(fixture('MARUTI-2025-integrated.json').toString());
    const f=integratedAnnualFiling(text,row);
    expect(f).not.toBeNull();expect(parseIndiaXbrl(text,f!)[0].fy).toBe(2025);
  });
  it('quarantines inconsistent profit fields while retaining independently reported annual revenue',()=>{
    const f=list('TATACONSUM').find((r:any)=>r.toDate==='31-Mar-2019'&&r.consolidated==='Consolidated');
    const y=parseIndiaXbrl(gunzipSync(fixture('TATACONSUM-2019.xml.gz')).toString(),f)[0];
    expect(y.netIncome).toBeNull();expect(y.totalNetIncome).toBeNull();expect(y.dilutedShares).toBeNull();
    expect(y.revenue).toBe(72515000000);expect(y.sourceWarnings?.[0]).toMatch(/attribution/);
  });
  it('uses actual split event dates, not Yahoo monthly bucket keys',()=>{
    const raw=JSON.parse(fixture('KOTAKBANK-splits.json').toString());
    expect(indiaSplits(raw)).toContainEqual({date:'2026-01-14',factor:5});
  });
  it('combines the official simultaneous bonus and split without double-counting Yahoo',()=>{
    const rows=JSON.parse(fixture('BAJFINANCE-actions.json').toString());
    const splits=mergeIndiaActions([{date:'2025-06-16',factor:2}],rows,'BAJFINANCE');
    expect(splits).toEqual([{date:'2025-06-16',factor:10}]);
    expect(mergeIndiaActions([],rows,'TCS')).toEqual([]);
  });
  it('keeps NBFC annual revenue with unknown parent profit rather than substituting group profit',()=>{
    const f=list('BAJFINANCE').find((r:any)=>r.toDate==='31-Mar-2019'&&r.consolidated==='Consolidated');
    const y=parseIndiaDetail(JSON.parse(fixture('BAJFINANCE-2019-detail.json').toString()),f);
    expect(y.revenue).toBe(184850900000);expect(y.netIncome).toBeNull();expect(y.preTaxIncome).toBe(61791600000);
  });
  it('accepts only verified historical ticker aliases, not an unrelated issuer',()=>{
    const f=filing('ETERNAL'),text=gunzipSync(fixture('ETERNAL-2024.xml.gz')).toString();
    expect(parseIndiaXbrl(text,f)[0].fy).toBe(2024);
    expect(()=>parseIndiaXbrl(text.replaceAll('ZOMATO','INFY'),f)).toThrow(/identity/);
  });
  it('retains legacy parent income when the newer attribution fields do not exist',()=>{
    const f=list('ASIANPAINT').find((r:any)=>r.toDate==='31-Mar-2016'&&r.consolidated==='Consolidated');
    const raw=JSON.parse(fixture('ASIANPAINT-2016-detail.json').toString());
    expect(parseIndiaDetail(raw,f).netIncome).toBe(17451600000);
    expect(()=>parseIndiaDetail({...raw,conNonCon:'Non-Consolidated'},f)).toThrow();
  });
  it.each([['TCS',2012,488938300000,104134900000],['HDFCBANK',2015,602121800000,106888900000],['INFY',2017,592890000000,138180000000]])('reads recorded legacy %s %i labels', (s,fy,revenue,netIncome)=>{
    const f=list(String(s)).find((r:any)=>r.toDate===`31-Mar-${fy}`&&r.consolidated==='Consolidated');
    const y=parseIndiaLegacy(gunzipSync(fixture(`${s}-${fy}.html.gz`)).toString(),f);
    expect(y.revenue).toBe(revenue);expect(y.netIncome).toBe(netIncome);expect(y.ocf).toBeNull();
  });
  it.each([['RELIANCE', 9144720000000, 696210000000], ['TCS', 2408930000000, 459080000000], ['ITC', 768404900000, 204587800000]])('parses %s annual totals', (s, revenue, netIncome) => {
    const y = parseIndiaXbrl(xml(String(s)), filing(String(s)))[0];
    expect(y.revenue).toBe(revenue); expect(y.netIncome).toBe(netIncome);
  });
  it('sums disjoint debt components and excludes minority equity', () => {
    const y = parseIndiaXbrl(xml('RELIANCE'), filing('RELIANCE'))[0];
    expect(y.totalDebt).toBe(3246220000000);
    expect(y.equity).toBe(7934810000000);
    expect(y.capex).toBe(1528830000000);
    expect(y.operatingIncome).toBe(1114010000000);
  });
  it('extracts banking fields without treating deposits as borrowing or inventing intangible zeros', () => {
    const y = parseIndiaXbrl(xml('HDFCBANK'), filing('HDFCBANK'))[0];
    expect(y.interestIncome).toBe(2836490200000);
    expect(y.deposits).toBe(23768872800000);
    expect(y.loans).toBe(25658914100000);
    expect(y.creditLossProvision).toBe(250182800000);
    expect(y.totalDebt).toBe(7306154600000);
    expect(y.equity).toBe(4537425300000);
    expect(y.tangibleEquity).toBeNull();
  });
  it('rejects issuer mismatch, standalone substitution and annual metadata mismatch', () => {
    expect(() => parseIndiaXbrl(xml('INFY'), filing('TCS'))).toThrow(/identity/i);
    expect(() => parseIndiaXbrl(xml('INFY').replaceAll('>Consolidated<','>Standalone<'), filing('INFY'))).toThrow(/consolidated/i);
    expect(() => parseIndiaXbrl(xml('INFY'), {...filing('INFY'), toDate:'31-Mar-2023'})).toThrow(/annual/i);
  });
  it('reads legacy annual income in lakhs without inventing balance sheets or cash flows', () => {
    const f = list('RELIANCE').find((r: any) => r.toDate === '31-Mar-2015' && r.consolidated === 'Consolidated');
    const y = parseIndiaLegacy(gunzipSync(fixture('RELIANCE-2015.html.gz')).toString(), f);
    expect(y.revenue).toBe(3754348700000);
    expect(y.netIncome).toBe(235660300000);
    expect(y.operatingIncome).toBe(258168700000);
    expect(y.da).toBe(115470100000);
    expect(y.equity).toBeNull(); expect(y.ocf).toBeNull();
    expect(y.statementCoverage?.balance).toBe(false);
  });
  it('selects consolidated annual records with usable XBRL or legacy HTML only', () => {
    const rows = selectIndiaFilings(list('RELIANCE'), 'RELIANCE');
    expect(rows.some(r => r.toDate === '31-Mar-2015')).toBe(true);
    expect(rows.every(r => r.consolidated === 'Consolidated')).toBe(true);
    expect(selectIndiaFilings([{...filing('INFY'), params:undefined,xbrl:'https://nsearchives.nseindia.com/corporate/xbrl/-',resultDetailedDataLink:null}], 'INFY')).toEqual([]);
  });
  it('maps ADRs and local listings to one issuer', () => {
    expect(indiaSymbol('INFY.US')).toBe('INFY');
    expect(indiaSymbol('INFY.NSE')).toBe('INFY');
    expect(indiaSymbol('HDB.US')).toBe('HDFCBANK');
    expect(indiaSymbol('RIGD.LSE')).toBe('RELIANCE');
    expect(() => indiaSymbol('AAPL.US')).toThrow();
  });
  it('fills Yahoo missing lines and later years only after same-currency totals agree', () => {
    const official = {...emptyYear('2024-03-31','INR'),revenue:1000,netIncome:100};
    const yahoo = {...official,ocf:120};
    const latest = {...yahoo,fy:2025,end:'2025-03-31'};
    expect(mergeIndiaYahoo([official],[yahoo,latest]).years.map(y=>y.fy)).toEqual([2024,2025]);
    expect(mergeIndiaYahoo([official],[yahoo]).years[0].ocf).toBe(120);
    expect(mergeIndiaYahoo([official],[{...yahoo,revenue:2000},latest]).years).toEqual([official]);
    expect(mergeIndiaYahoo([official],[{...yahoo,currency:'USD'},latest]).years).toEqual([official]);
    expect(mergeIndiaYahoo([official],[latest]).years).toEqual([official]);
  });
});
