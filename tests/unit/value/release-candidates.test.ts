import {expect,it} from 'vitest';
import {capFloorCandidates} from '@/lib/value/release-candidates';
import type {Company} from '@/lib/value/types';

const company=(id:string,marketCapUsd:number|null,extra:Partial<Company>={}):Company=>({id,name:id,code:id.split('.')[0],exchange:'US',country:'US',currency:'USD',isin:null,cik:null,lei:null,edinetCode:null,sector:null,industry:null,kind:'operating',listings:[id],marketCapUsd,description:null,...extra} as Company);
const noExclusion=()=>null;

it('proposes large companies that no index or tracked investor covers, and nothing already released',()=>{
 const companies=[company('NET.US',115e9),company('SMALL.US',9e9),company('IDX.US',50e9,{indexes:['S&P 500']}),company('HELD.US',50e9,{heldBySuperinvestors:true}),company('OLD.US',50e9),company('NOCAP.US',null)];
 expect(capFloorCandidates({companies,baselineIds:['OLD.US'],exclusion:noExclusion})).toEqual([{id:'NET.US',reasons:[]}]);
});
it('holds a second listing of an issuer that is already published or already a larger candidate',()=>{
 const companies=[company('DTE.US',27e9,{cik:'0000936340'}),company('DTG.US',27e9,{cik:'0000936340'}),company('BIG.US',30e9,{cik:'1'}),company('BIG-B.US',29e9,{cik:'1'}),
  company('HSBA.LSE',323e9,{name:'HSBC Holdings PLC',isin:'GB0005405286',country:'GB',exchange:'LSE'}),company('0005.HK',345e9,{name:'HSBC Holdings PLC',isin:'GB0005405286',country:'HK',exchange:'HK'}),
  company('300750.SHE',190e9,{name:'Contemporary Amperex Technology Co., Limited Class A',country:'CN',exchange:'SHE'}),company('3750.HK',212e9,{name:'Contemporary Amperex Technology Co., Limited',country:'HK',exchange:'HK'})];
 expect(capFloorCandidates({companies,baselineIds:['DTE.US','HSBA.LSE','300750.SHE'],exclusion:noExclusion})).toEqual([
  {id:'0005.HK',reasons:['same issuer as HSBA.LSE']},{id:'3750.HK',reasons:['same issuer as 300750.SHE']},{id:'BIG-B.US',reasons:['same issuer as BIG.US']},{id:'BIG.US',reasons:[]},{id:'DTG.US',reasons:['same issuer as DTE.US']}]);
});
it('holds depositary receipts, H-share wrappers, B shares and preference shares as secondary instruments',()=>{
 const companies=[company('HY9H.DU',971e9,{name:'SK HYNIX GDR 144A/REGS 1'}),company('5.HK',345e9,{name:'HSBC Holdings PLC (HK Reg)'}),company('SANB.LSE',59e9,{name:'SANTANDER UK 8 5/8% NON-CUM STLG PRF'}),company('BBDO.US',41e9,{name:'Banco Bradesco S/A ADR'}),company('6288.HK',132e9,{name:'Fast Retailing Co DRC'}),
  company('AXBA.LSE',40e9,{name:'AXBA',code:'AXBA',exchange:'LSE',isin:'US05462W3079'}),company('GALDY.US',48e9,{name:'GALDERMA GROUP AG',code:'GALDY'}),company('200725.SHE',24e9,{name:'BOE Tech Group',code:'200725',exchange:'SHE'}),company('2328.HK',48e9,{name:'PICC Property & Casualty-H'}),company('SUNB.LSE',31e9,{name:'SUNBELT RENTALS HOLDINGS CDI'}),
  company('LISN.SW',112e9,{name:'Chocoladefabriken Lindt & Spruengli AG N'}),company('NET.US',115e9,{name:'Cloudflare Inc',code:'NET'})];
 const result=capFloorCandidates({companies,baselineIds:[],exclusion:noExclusion});
 expect(result.filter(r=>r.reasons.includes('secondary instrument')).map(r=>r.id).sort()).toEqual(['200725.SHE','2328.HK','5.HK','6288.HK','AXBA.LSE','BBDO.US','GALDY.US','HY9H.DU','SANB.LSE','SUNB.LSE']);
 expect(result.find(r=>r.id==='LISN.SW')?.reasons).toEqual([]);
 expect(result.find(r=>r.id==='NET.US')?.reasons).toEqual([]);
});
it('treats a long shared name stem as one issuer because vendor names truncate mid-word, keeping the larger listing',()=>{
 const companies=[company('300750.SHE',190e9,{name:'Contemporary Amperex Technology Co Ltd Class A',code:'300750',exchange:'SHE'}),company('3750.HK',212e9,{name:'Contemporary Amperex Technology Co., Limite',code:'3750',exchange:'HK'}),company('MITSU.JP',20e9,{name:'Mitsubishi'}),company('MITSUE.JP',20e9,{name:'Mitsubishi Electric'}),
  company('601991.SHG',14e9,{name:'Datang International Power Generation Co Ltd Class A',code:'601991',exchange:'SHG'}),company('991.HK',12e9,{name:'DATANG INTERNATIONAL POWER GENERAT',code:'991',exchange:'HK'})];
 expect(capFloorCandidates({companies,baselineIds:['300750.SHE'],exclusion:noExclusion})).toEqual([{id:'3750.HK',reasons:['same issuer as 300750.SHE']},{id:'601991.SHG',reasons:[]},{id:'991.HK',reasons:['same issuer as 601991.SHG']},{id:'MITSU.JP',reasons:[]},{id:'MITSUE.JP',reasons:[]}]);
});
it('holds preferred lines on US venues',()=>{
 expect(capFloorCandidates({companies:[company('AXIA-PC.US',23e9,{name:'AXIA Energia SA',code:'AXIA-PC'})],baselineIds:[],exclusion:noExclusion})).toEqual([{id:'AXIA-PC.US',reasons:['secondary instrument']}]);
});
it('carries the pooled-vehicle exclusion as a hold reason',()=>{
 const companies=[company('PHYS.TO',15e9)];
 expect(capFloorCandidates({companies,baselineIds:[],exclusion:()=>'provider type: ETF'})).toEqual([{id:'PHYS.TO',reasons:['excluded: provider type: ETF']}]);
});
