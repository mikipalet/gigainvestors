import {expect,it} from 'vitest';
import {completeCachedYears} from '@/lib/value/completeness/cached-years';
import {emptyYear} from '@/lib/value/completeness/second-sources';
import {runNumericTests} from '@/lib/value/tests';
const company={id:'PLX.PA',cik:null,source:'eodhd' as const};
const own=()=>Array.from({length:5},(_,i)=>({...emptyYear(`${2021+i}-08-31`,'EUR'),revenue:[731,842,1052,1210,1287][i]*1e6}));
it('records Solventum historical Health Care segment basis and disclosed capex without parent cash flow',()=>{
 const rows=completeCachedYears({...company,id:'SOLV.US'},[2020,2021,2022,2023,2024,2025].map(fy=>emptyYear(`${fy}-12-31`,'USD')),()=>null);
 expect(rows).toHaveLength(7);
 expect(rows[0]).toMatchObject({fy:2019,revenue:7431e6,operatingIncome:1858e6,capex:264e6,da:392e6,totalAssets:14790e6,ocf:null,dilutedShares:null});
 expect(rows[0].predecessor?.detail).toContain('dual credit');
});
it('extends Honeywell Aerospace to seven periods using only its own segment observations',()=>{
 const rows=completeCachedYears({...company,id:'HONA.US'},[2023,2024,2025].map(fy=>emptyYear(`${fy}-12-31`,'USD')),()=>null);
 expect(rows.map(y=>y.fy)).toEqual([2019,2020,2021,2022,2023,2024,2025]);
 expect(rows[0]).toMatchObject({revenue:14054e6,operatingIncome:3607e6,capex:null,equity:null,dilutedShares:null});
});
it('restores Pluxee segment years through the nightly completion path without inventing statement fields',()=>{
 const rows=completeCachedYears(company,own(),()=>null);
 expect(rows.map(y=>y.fy)).toEqual([2019,2020,2021,2022,2023,2024,2025]);
 expect(rows[0]).toMatchObject({revenue:892e6,operatingIncome:276e6,capex:null,ocf:null,netIncome:null,dilutedShares:null,equity:null,predecessor:{parent:'Sodexo',segment:'Benefits & Rewards Services',basis:'segment'}});
 expect(rows[1].provenance?.operatingIncome.field).toContain('Underlying');
 expect(runNumericTests({years:rows,kind:'operating'}).management.numeric).toBe('unclear');
 expect(completeCachedYears(company,rows,()=>null)).toEqual(rows);
});
it('keeps standalone observations and sources ahead of older segment disclosures',()=>{
 const standalone={...emptyYear('2019-08-31','EUR'),revenue:999,netIncome:12};
 const rows=completeCachedYears(company,[standalone,...own()],()=>null);
 expect(rows.find(y=>y.fy===2019)).toMatchObject({revenue:999,netIncome:12});
 expect(rows.find(y=>y.fy===2019)?.predecessor).toBeUndefined();
});
it('labels matching combined-account revenue without overwriting later restated earnings',()=>{
 const rows=own();rows[1].operatingIncome=187e6;
 const y=completeCachedYears(company,rows,()=>null).find(y=>y.fy===2022)!;
 expect(y.predecessor?.basis).toBe('combined');
 expect(y.provenance?.revenue.source).toContain('Prospectus');
 expect(y.operatingIncome).toBe(187e6);
});
it('identifies a combined period while retaining a later restatement and its field source',()=>{
 const rows=own();rows[0].revenue=730e6;rows[0].provenance={revenue:{source:'later-report',field:'revenue',method:'reported'}};
 const y=completeCachedYears(company,rows,()=>null).find(y=>y.fy===2021)!;
 expect(y.predecessor?.basis).toBe('combined');
 expect(y.revenue).toBe(730e6);expect(y.provenance?.revenue.source).toBe('later-report');
});
it('repairs an absent currency label only when the dated combined-account figures match',()=>{
 const rows=own();rows[0].currency=null;
 const y=completeCachedYears(company,rows,()=>null).find(y=>y.fy===2021)!;
 expect(y.currency).toBe('EUR');expect(y.predecessor?.basis).toBe('combined');
 rows[0].revenue=1;
 expect(completeCachedYears(company,rows,()=>null).find(y=>y.fy===2021)?.predecessor).toBeUndefined();
});
it('restores Veralto with disclosed capex while leaving cash conversion undecided for the segment year',()=>{
 const rows=completeCachedYears({...company,id:'VLTO.US'},[emptyYear('2020-12-31','USD')],()=>null);
 expect(rows[0]).toMatchObject({fy:2019,revenue:4399e6,operatingIncome:1052e6,capex:54e6,da:111e6,totalAssets:4882e6,ocf:null,equity:null});
});
it('adds the Kalmar and TKMS disclosed predecessor periods without making income from sales alone',()=>{
 const kalmar=completeCachedYears({...company,id:'KALMAR.HE'},[emptyYear('2021-12-31','EUR')],()=>null);
 expect(kalmar.filter(y=>y.fy<2021).map(y=>[y.fy,y.revenue,y.operatingIncome])).toEqual([[2019,1722.6e6,null],[2020,1529.2e6,null]]);
 const tkms=completeCachedYears({...company,id:'TKMS.XETRA'},[emptyYear('2022-09-30','EUR')],()=>null);
 expect(tkms.filter(y=>y.fy<2022).map(y=>[y.fy,y.revenue,y.operatingIncome])).toEqual([[2019,1800e6,0],[2020,1760e6,15e6],[2021,2022e6,24e6]]);
});
it('uses Sandisk flash product revenue with the reported 52/53-week fiscal dates',()=>{
 const rows=completeCachedYears({...company,id:'SNDK.US'},[emptyYear('2022-07-01','USD')],()=>null);
 expect(rows.filter(y=>y.fy<2022).map(y=>[y.fy,y.revenue,y.operatingIncome])).toEqual([[2020,7769e6,null],[2021,8706e6,null]]);
});
it('uses disclosed Freight capex and SpecialtyCo cash flow, never parent shares',()=>{
 const freight=completeCachedYears({...company,id:'FDXF.US'},[emptyYear('2023-05-31','USD')],()=>null);
 expect(freight.filter(y=>y.fy<2023).map(y=>[y.fy,y.revenue,y.operatingIncome,y.capex])).toEqual([[2020,7102e6,580e6,539e6],[2021,7833e6,1005e6,320e6],[2022,9532e6,1663e6,319e6]]);
 const syensqo=completeCachedYears({...company,id:'SYENS.BR'},[emptyYear('2021-12-31','EUR')],()=>null);
 expect(syensqo[0]).toMatchObject({fy:2020,revenue:5381e6,operatingIncome:-931e6,netIncome:-1285e6,ocf:1092e6,capex:317e6,dilutedShares:null});
});
