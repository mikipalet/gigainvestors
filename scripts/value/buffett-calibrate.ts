/** Offline analysis. Run: npx tsx scripts/value/buffett-calibrate.ts
 * Sources fetched separately by buffett-filings.py. No writes to live corpus.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statfsSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { annualPrefix, holdingEvents, proposeValuation, quarterPrice, quarterStart, scorePurchase } from '../../lib/value/buffett-calibration';
import { T } from '../../lib/value/config';
import { publishedBuyPrice } from '../../lib/value/buy-price';
import { buyReturnInputs } from '../../lib/value/owner-return';
import { valuationFlags } from '../../lib/value/data-quality';
import { earningsVolatility } from '../../lib/value/history';
import { checkIntegrity } from '../../lib/value/integrity';
import { parseYahooHistory } from '../../lib/value/price-history';
import { normalizeEodhd } from '../../lib/value/normalize-eodhd';
import { ownerEarningsBridge } from '../../lib/value/owner-earnings';
import { median } from '../../lib/value/metrics';
import { readPrices } from '../../lib/value/price-files';
import { runNumericTests } from '../../lib/value/tests';
import { valueCompany, presentValue } from '../../lib/value/valuation';
import { bestWesternListing } from '../../lib/value/western';
import { CALIBRATION } from '../../lib/value/calibration';
import { calibrationSummary } from './stages/calibrate';
import { QUALITY_TESTS, type Analysis, type Company, type Fundamentals, type PriceHistory, type Valuation } from '../../lib/value/types';

const ROOT=path.join(os.homedir(),'value-corpus'), OUT=path.join(ROOT,'staging/buffett-1');
const disk=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<5*1024**3)throw new Error('Disk below 5 GB; stopped');};
const read=<T>(file:string):T|null=>existsSync(file)?JSON.parse(readFileSync(file,'utf8')):null;
const corpus=<T>(file:string)=>read<T>(path.join(ROOT,file));
const write=(name:string,value:unknown)=>{disk();writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n');};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const companies=readFileSync(path.join(ROOT,'universe.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l) as Company);
const companyMap=new Map(companies.map(c=>[c.id,c]));
const alias=new Map(companies.flatMap(c=>c.listings.map(id=>[id,c.id] as const)));
const required='AAPL BAC IBM WFC USB MCO AXP KO DVA VRSN V MA AMZN KR OXY CVX PCP KHC DAL UAL LUV AAL GM CHTR SNOW TSM CB SIRI DPZ POOL ULTA NUE LEN DHI'.split(' ').map(t=>t+'.US');
required.push('LEN-B.US');
const cusips=new Map<string,string>();
for(const c of companies)if(c.isin?.startsWith('US')&&c.id.endsWith('.US'))cusips.set(c.isin.slice(2,-1),c.id);
for(const id of required){const raw=corpus<any>(`raw/eodhd/${id}.json`);if(raw?.General?.CUSIP)cusips.set(raw.General.CUSIP,id);}
for(const [c,id] of Object.entries({'H1467J104':'CB.US','740189105':'PCP.US','874039100':'TSM.US','23331A109':'DHI.US','526057302':'LEN-B.US','526057104':'LEN.US','16117M305':'CHTR.US','82968B103':'SIRI.US','G1151C101':'ACN.US','G0408V102':'AON.US','G3223R108':'EG.US','872540109':'TJX.US','G7665A101':'RIG.US','G0176J109':'ALLE.US'}))cusips.set(c,id);
// Legacy CUSIPs and dual-class listings are explicit; predecessors keep their own IDs.
for(const [c,id] of Object.entries({'529771107':'LXK.US','902124106':'TYC.US','369604103':'GE.US','67104A101':'OSI.US','80105N105':'SNY.US','12189T104':'BNI.US','G47766101':'IR.US','260561105':'DJ.US','50075N104':'KFT.US','929251106':'WBC.US','G4776G101':'IR.US','37733W105':'GSK.US','92927K102':'WBC.US','278058102':'ETN.US','210371100':'CEG-2008.US','62985Q101':'NLC.US','30231G102':'XOM.US','641069406':'NSRGY.US','94973V107':'ELV.US','064058100':'BK.US','25490A101':'DTV.US','530322106':'LMCA.US','523768109':'LEE.US','92553P201':'VIAB.US','G47791101':'IR.US','637071101':'NOV.US','584404107':'MEG.US','25490A309':'DTV.US','50076Q106':'KRFT.US','167250109':'CBI.US','531229102':'LMCA.US','85571Q102':'STRZA.US','867224107':'SU.US','25470M109':'DISH.US','G5480U104':'LBTYA.US','G5480U120':'LBTYK.US','531229300':'LMCK.US','30219G108':'ESRX.US','58441K100':'MEG.US','76131D103':'QSR.US','90130A101':'FOXA.US','61166W101':'MON.US','862121100':'STOR.US','G9001E102':'LILA.US','G9001E128':'LILAK.US','756577102':'RHT.US','G85158106':'STNE.US','922908363':'VOO.US','78462F103':'SPY.US','067901108':'GOLD.US','G0403H108':'AON.US','G7709Q104':'RPRX.US','00507V109':'ATVI.US','G6693N103':'NU.US','92556H206':'PARA.US','G6683N103':'NU.US','25243Q205':'DEO.US','422806208':'HEI-A.US'}))cusips.set(c,id);
const quarters=read<any[]>(path.join(OUT,'sec/quarters.json'))!;
const quarterMap=new Map(quarters.map(q=>[q.date,q]));
const events=holdingEvents(quarters.map(q=>({date:q.date,holdings:Object.fromEntries(Object.entries(q.holdings).map(([k,v]:[string,any])=>[k,v.shares]))})))
 .filter(e=>e.date>='2005'&&e.date<'2026').map(e=>({...e,id:cusips.get(e.cusip)??null,name:quarterMap.get(e.date).holdings[e.cusip].name,sources:quarterMap.get(e.date).sources}));
write('holding-events.json',events);
const selected:any[]=[];
for(const e of events.filter(e=>e.type==='first-observed'))selected.push({...e,origin:'13F first observation',manager:'unattributed',special:false});
// Identify corporate actions instead of pretending these are cash purchases.
const corporate=new Set(['KHC.US','DOW.US','KD.US','WBD.US','CEG.US','SRG.US','MDLZ.US','SPY.US','VOO.US','KRFT.US','WBC.US','PARA.US']);
for(const p of selected)if(corporate.has(p.id)||(p.id==='CHTR.US'&&p.date==='2016-06-30')||(p.id==='SIRI.US'&&p.date==='2024-09-30')){p.special=true;p.note='Corporate action / predecessor continuity; not an ordinary first purchase';}
for(const id of required) {
 if(selected.some(p=>p.id===id))continue;
 const add=id==='KO.US'?undefined:events.find(e=>e.id===id&&e.type==='add');
 selected.push(add?{...add,origin:'first observed add to preexisting position',manager:'unattributed',special:false}:{id,date:null,name:id,origin:'requested coverage',manager:'unattributed',special:false,note:'No mapped purchase event in the SEC interval'});
}
const source=(y:number)=>`https://www.berkshirehathaway.com/${y}ar/${y}ar.pdf`;
const extra=(id:string,date:string,name:string,more:any)=>selected.push({id,date,name,manager:'Buffett',special:false,origin:'documented supplemental event',...more});
extra('AAPL.US','2016-12-31','Apple — Buffett general account',{sources:[{url:source(2020)}],note:'2020 letter distinguishes general-account buying late in 2016 from earlier separately managed shares'});
extra('BAC.US','2011-09-30','Bank of America preferred + warrants',{special:true,sources:[{url:source(2011)}],note:'$5bn 6% preferred plus 700m warrants at $7.14; common-stock quarter price is only a counterfactual, not package cost'});
extra('OXY.US','2019-06-30','Occidental preferred + warrants',{special:true,sources:[{url:source(2019)}],note:'$10bn preferred financing + warrants; separate from common shares'});
extra('OXY.US','2022-03-31','Occidental 2022 common reentry',{sources:quarterMap.get('2022-03-31').sources});
extra('DHI.US','2025-06-30','D.R. Horton 2025 reentry',{sources:quarterMap.get('2025-06-30').sources});
extra('KO.US','1988-03-31','Coca-Cola 1988',{window:'1988',fixedPrice:592540000/14172500/16,priceNote:'1988 disclosed cost/share divided by subsequent 16:1 splits; annual accumulation, quarter unknown',sources:[{url:'https://www.berkshirehathaway.com/letters/1988.html'}]});
extra('AXP.US','1994-03-31','American Express 1994 adds',{window:'1994',sources:[{url:'https://www.berkshirehathaway.com/letters/1994.html'}],note:'Year-only purchase window; cutoff 1994-01-01, annual mean close proxy'});
extra('MCO.US','2000-09-30','Moody’s 2000 spin-off',{special:true,sources:[{url:source(2000)}],note:'Inherited from Dun & Bradstreet; no independent MCO execution cost'});
extra('TSCO.LSE','2006-03-31','Tesco initial 2006',{sources:[{url:'https://www.irishtimes.com/business/retail-and-services/even-warren-buffett-makes-mistakes-1.1949573'},{url:source(2014)}],note:'Initial March 2006 position; later regret documented in 2014 letter'});
extra('1211.HK','2008-09-30','BYD H shares subscription',{fixedPrice:8,special:true,manager:'Berkshire Energy / Munger',sources:[{url:'https://www.hkexnews.hk/listedco/listconews/sehk/2009/0419/ltn20090419045.pdf'}],priceNote:'HKD 8 original share basis; 2008 agreement, completed 2009; H-share FX and later capital actions require reconciliation'});
for(const [id,name] of [['8001.JP','Itochu'],['8002.JP','Marubeni'],['8058.JP','Mitsubishi'],['8031.JP','Mitsui'],['8053.JP','Sumitomo']]) {
 for(const date of ['2019-09-30','2020-06-30'])extra(id,date,name,{sensitivity:date==='2020-06-30',window:'2019-09 to 2020-08',sources:[{url:'https://www.berkshirehathaway.com/news/aug3020.pdf'}],note:'Accumulated over 12 months; these are start/end-window scenarios, not known individual trade quarters'});
}
for(const p of selected) {
 if(p.id==='AAPL.US'&&p.date==='2016-03-31'){p.manager='documented manager';p.managerSource=source(2020);}
 if(p.id==='AMZN.US'){p.manager='documented manager';p.managerSource='https://buffett.cnbc.com/video/2019/05/06/berkshires-amazon-buy-isnt-a-shift-away-from-value-investing.html';}
 if(['V.US','MA.US'].includes(p.id)){p.manager='documented manager';p.managerSource='https://fortune.com/2012/02/25/dont-believe-every-buffett-buys-headline/';}
 if(p.id==='DVA.US'){p.manager='documented manager';p.managerSource='https://www.forbes.com/sites/steveschaefer/2013/07/08/after-obamacare-hit-davita-gets-berkshire-bump/';}
 if(p.id==='SNOW.US'){p.fixedPrice=120;p.priceNote='IPO private placement / secondary purchase at $120, SEC prospectus';p.special=true;p.manager='manager attribution unresolved';p.sources.push({url:'https://www.sec.gov/Archives/edgar/data/1640147/000162828020013667/snowflake424b4.htm'});}
 p.regretted=['IBM.US','KHC.US','DAL.US','UAL.US','LUV.US','AAL.US','TSCO.LSE'].includes(p.id);
}
// Monthly local government yields: latest observation preceding quarter start.
const bondSeries:Record<string,string>={US:'GS10',JP:'IRLTLT01JPM156N',GB:'IRLTLT01GBM156N',CH:'IRLTLT01CHM156N'};
function historicalBond(country:string,cutoff:string) {
 const series=bondSeries[country],file=path.join(OUT,`macro/${series}.csv`);
 if(!series||!existsSync(file))return null;
 const values=readFileSync(file,'utf8').trim().split('\n').slice(1).map(l=>l.split(','));
 const row=values.filter(([d,v])=>d.slice(0,7)<cutoff.slice(0,7)&&v!==''&&v!=='.'&&Number.isFinite(Number(v))).at(-1);
 return row?{yield:Number(row[1])/100,date:row[0],source:`https://fred.stlouisfed.org/series/${series}`}:null;
}
const cache=new Map<string,any>();
function load(id:string){
 if(cache.has(id))return cache.get(id);
 const resolved=existsSync(path.join(ROOT,`fundamentals/${id}.json`))?id:alias.get(id)??id;
 const supplemental=read<any>(path.join(OUT,`raw/${id==='LEN-B.US'?'LEN.US':id}.json`));
 const raw=supplemental?.Financials?supplemental:corpus<any>(`raw/eodhd/${resolved}.json`);
 const a=corpus<Analysis>(`analysis/${resolved}.json`),f=corpus<Fundamentals>(`fundamentals/${resolved}.json`)??(raw?.Financials?normalizeEodhd(raw,id).fundamentals:null);
 let c=a?.company??companyMap.get(resolved)??corpus<Company>(`companies/${resolved}.json`);
 if(!c&&raw?.General)c={id,name:raw.General.Name,code:id.split('.')[0],exchange:id.split('.').at(-1)!,country:raw.General.CountryISO,currency:raw.General.CurrencyCode,kind:'operating',listings:[id],source:'eodhd'} as Company;
 if(id==='TSM.US'&&c)c={...c,id,country:'US',currency:'USD'};
 const priceId=id;
 const ph=corpus<any>(`prices-history-long/${priceId}.json`)??corpus<any>(`prices-history/${id}.json`)??[];
 const yahoo=read<any>(path.join(OUT,`prices/${priceId}.yahoo.json`));
 let prices:PriceHistory=yahoo?parseYahooHistory(yahoo):Array.isArray(ph)?ph:ph.prices??[];

 if(!prices.length&&id==='PCP.US'){const rows=read<any[]>(path.join(OUT,`prices/${id}.json`));prices=Array.isArray(rows)?rows.map(r=>[r.date.slice(0,7),r.close]):[];}
 const result={a,f,raw,c,prices};cache.set(id,result);return result;
}
function evaluate(p:any, lagMissing=false){
 if(!p.id||!p.date)return {...p,t5:'UUUUU',missing:'No mapped issuer or dated event',before:scorePurchase(null,.5,null,'UUUUU'),after:scorePurchase(null,.5,null,'UUUUU')};
 const {f,raw,c,prices}=load(p.id), cutoff=quarterStart(p.date);
 let priceInfo=quarterPrice(prices,p.date);
 if(p.window&&/^\d{4}$/.test(p.window)){
  const ps=prices.filter(([m]:[string,number])=>m.startsWith(p.window));
  priceInfo=ps.length===12?{price:ps.reduce((s:number,[,v]:[string,number])=>s+v,0)/12,low:Math.min(...ps.map((r:any)=>r[1])),high:Math.max(...ps.map((r:any)=>r[1])),method:'mean-monthly-close (not VWAP)'}:null;
 }
 const price=p.fixedPrice??priceInfo?.price??null;
 if(!f||!c)return {...p,price,priceInfo,t5:'UUUUU',missing:'Corpus fundamentals / company unavailable',before:scorePurchase(null,.5,price,'UUUUU'),after:scorePurchase(null,.5,price,'UUUUU')};
 // Normalize a copy truncated before the cutoff to recover older raw years beyond the current 30-year cap.
 const historicalRaw=raw?structuredClone(raw):null;
 const filed:Record<string,string>={};
 if(historicalRaw)for(const table of Object.values(historicalRaw.Financials??{}) as any[]) {
  if(!table.yearly)continue;
  for(const [end,row] of Object.entries(table.yearly) as [string,any][]) {
   const date=row.filing_date?.slice(0,10);
   if(date&&date>end&&/^\d{4}-\d{2}-\d{2}$/.test(date))filed[end]=filed[end]&&filed[end]>date?filed[end]:date;
   if(end>=cutoff)delete table.yearly[end];
  }
 }
 const full=historicalRaw?normalizeEodhd(historicalRaw,p.id).fundamentals:f;
 if(lagMissing)for(const y of full.years)if(!filed[y.end])filed[y.end]=new Date(Date.parse(y.end)+183*86400000).toISOString().slice(0,10);
 let years=annualPrefix(full.years,filed,p.date);
 const knownYears=years.length;
 // No fallback in the principal table. A separate lagged scenario is explicitly marked.
 if(!years.length&&c.source!=='eodhd')years=full.years.filter((y:any)=>new Date(Date.parse(y.end)+183*86400000).toISOString().slice(0,10)<cutoff).map((y:any)=>({...y}));
 const reporting=years.at(-1)?.currency??full.currency;
 let fx=reporting.toUpperCase()===c.currency.toUpperCase()?1:reporting==='GBP'&&['GBX','GBp'].includes(c.currency)?100:null;
 if(p.id==='TSM.US'&&reporting==='TWD'){const rows=readFileSync(path.join(OUT,'macro/EXTAUS.csv'),'utf8').trim().split('\n').slice(1).map(l=>l.split(','));const rate=rows.filter(([d,v])=>d.slice(0,7)<cutoff.slice(0,7)&&Number(v)>0).at(-1);fx=rate?1/Number(rate[1]):null;}
 const monthly=new Map(prices.filter(([m]:[string,number])=>m<cutoff.slice(0,7)));
 years=years.map((y:any)=>({...y,marketCap:fx&&y.dilutedShares&&monthly.get(y.end.slice(0,7))?Number(monthly.get(y.end.slice(0,7)))*y.dilutedShares/fx:null}));
 const prefix={...full,years,ttm:null};
 const integrity=checkIntegrity(prefix,{source:c.source,priceHistory:[...monthly] as PriceHistory});
 years=prefix.years;
 const numeric=runNumericTests({years,kind:c.kind,priceHistoryPending:false});
 const t5=QUALITY_TESTS.map(k=>numeric[k as keyof typeof numeric].numeric[0].toUpperCase()).join('');
 const cv=numeric.understandable.metrics.opMarginCv,vol=earningsVolatility({opMarginCv:cv}),mos=T.price.requiredMos[vol];
 const bond=historicalBond(c.country,cutoff);
 const result=valueCompany({years,kind:c.kind,currency:reporting,bondYield:bond?.yield??null,cyclical:vol==='volatile',priceHistory:[...monthly] as PriceHistory});
 const v=result.valuation;
 if(v&&fx)v.perShareTrading={currency:c.currency,fxRate:fx,low:v.perShare.low*fx,mid:v.perShare.mid*fx,high:v.perShare.high*fx};
 const comparisonFlags=valuationFlags({price,mid:v?.perShareTrading?.mid??null,assumptions:v?.assumptions??[]});
 const eligible=integrity.ok&&fx!==null&&comparisonFlags.length===0;
 const before=scorePurchase(fx!==null?v:null,mos,price,t5,eligible);
 const proposal=v?proposeValuation({valuation:v,years,t5,cv,mos}):null;
 const after=scorePurchase(fx!==null?(proposal?.valuation??v):null,proposal?.mos??mos,price,t5,eligible);
 const blocked=[...comparisonFlags,...QUALITY_TESTS.filter(k=>numeric[k as keyof typeof numeric].numeric!=='pass').map(k=>`${k}:${numeric[k as keyof typeof numeric].numeric}`),...(!integrity.ok?integrity.reasons:[]),...(fx===null?['historical FX / ADR basis unavailable']:[]),...(price===null?['purchase price unavailable']:[]),...(result.reason?[result.reason]:[]),...(before.ratio!==null&&before.ratio>1?['margin-of-safety price']:[]),...(!before.returnPass?['expected-return gate']:[])];
 const oe=ownerEarningsBridge(years),recent=oe.slice(-5);
 const ablations:Record<string,number|null>={};
 if(v?.method==='owner_earnings'){
  const buy=(g:number,r:number,n=v.normalized,m:number=mos)=>((presentValue({oe:n,g,r,terminal:v.terminalGrowth})+v.netCash)/v.shares)*(fx??1)*(1-m);
  ablations.discount8=buy(v.growth,Math.max(.08,(bond?.yield??0)+.04));
  ablations.equityEarningsWithoutNetCash=buy(v.growth,v.discountRate)-v.netCash/v.shares*(fx??1)*(1-mos);
  ablations.mos15=buy(v.growth,v.discountRate,v.normalized,.15);
  const first=oe.at(-11),end=oe.at(-1),rate=first?.value&&end?.value&&first.year.dilutedShares&&end.year.dilutedShares&&end.year.fy-first.year.fy===10?(end.value/end.year.dilutedShares/(first.value/first.year.dilutedShares))**.1-1:null;
  ablations.oeGrowth8=rate!==null&&Number.isFinite(rate)?buy(Math.max(0,Math.min(.08,rate)),v.discountRate):null;
  ablations.oeGrowth12=rate!==null&&Number.isFinite(rate)?buy(Math.max(0,Math.min(.12,rate)),v.discountRate):null;
  const noFloor=recent.map(r=>r.value!==null&&r.maintenanceCapex!==null&&r.growthCapex!==null&&r.year.capex!==null?r.value+(r.maintenanceCapex-Math.max(0,r.year.capex-r.growthCapex))*(r.allocation??1):null);
  ablations.noMaintenanceFloor=noFloor.length===5&&noFloor.every(x=>x!==null)?buy(v.growth,v.discountRate,Math.min(median(noFloor as number[])!,noFloor[4]!)):null;
  ablations.latestOE=end?.value?buy(v.growth,v.discountRate,end.value):null;
 }
 return {...p,price,priceInfo,currency:c.currency,cutoff,knownFilingDates:knownYears,filingAssumption:lagMissing?'183-day fallback for missing filing dates':knownYears?'provider filing dates':'183-day lag (dates unavailable)',fiscalYears:years.map((y:any)=>y.fy),inputHash:hash({years,prices:[...monthly],bond}),priceBasis:p.id==='TSM.US'?'USD per ADR; provider shares are ADR-equivalent; FRED EXTAUS lagged monthly TWD/USD':p.id==='PCP.US'?'EODHD original monthly close; no later listed-period split recorded':'corpus/Yahoo split-adjusted close; provider share series; not independently reconciled',bondBasis:p.id==='TSM.US'?'US listed ADR yield proxy; 10% floor also exceeds Taiwan 2021 annual 0.44% +4pp (CBC)':'local historical monthly government yield',restated:true,t5,tests:numeric,integrity,mos,valuation:v,valuationReason:result.reason,bond,before,after,proposalEligible:proposal?.eligible??false,proposedValuation:proposal?.valuation??null,ablations,blocked};
}
disk();mkdirSync(OUT,{recursive:true});
const purchases=selected.filter(p=>p.date||!selected.some(other=>other.id===p.id&&other.date)).map(p=>evaluate(p));write('purchases.json',purchases);
write('filing-lag-sensitivity.json',selected.filter(p=>required.includes(p.id)||p.regretted).filter(p=>p.date).map(p=>evaluate(p,true)));
const summaries=(rows:any[])=>({total:rows.length,withPrice:rows.filter(r=>r.price!=null).length,withValuation:rows.filter(r=>r.valuation).length,completeTests:rows.filter(r=>!/U|N/.test(r.t5)).length,qualityPass:rows.filter(r=>r.before.quality).length,priceComparable:rows.filter(r=>r.before.ratio!==null).length,qualityAndPrice:rows.filter(r=>r.before.quality&&r.before.ratio!==null).length,before:{buy:rows.filter(r=>r.before.buy).length,within20:rows.filter(r=>r.before.within20).length,priceOnly:rows.filter(r=>r.before.pricePass).length},after:{buy:rows.filter(r=>r.after.buy).length,within20:rows.filter(r=>r.after.within20).length,priceOnly:rows.filter(r=>r.after.pricePass).length},rejectedQuality:rows.filter(r=>r.t5.includes('F')).length,unknownQuality:rows.filter(r=>!r.t5.includes('F')&&r.t5!=='PPPPP').length});
const summariesAll={all:summaries(purchases),ordinary:summaries(purchases.filter(p=>!p.sensitivity&&!p.special&&p.manager!=='documented manager')),named:summaries(purchases.filter(p=>required.includes(p.id)||['TSCO.LSE','1211.HK','8001.JP','8002.JP','8058.JP','8031.JP','8053.JP'].includes(p.id))),regretted:summaries(purchases.filter(p=>p.regretted)),documentedManager:summaries(purchases.filter(p=>p.manager==='documented manager'))};
write('purchase-summary.json',summariesAll);console.log('Purchase summary',JSON.stringify(summariesAll));
if(process.argv.includes('--purchases-only'))process.exit(0);
const quotes={...readPrices(path.join(ROOT,'publish-repo/prices')),...readPrices(path.join(ROOT,'prices'))};
const current:any[]=[],calibration=new Map<string,Analysis>();const manifest:any[]=[];
let count=0;
for(const file of readdirSync(path.join(ROOT,'analysis')).filter(f=>f.endsWith('.json')).sort()){
 if(++count%1000===0){disk();console.log('Corpus',count);}
 const a=corpus<Analysis>(`analysis/${file}`);if(!a?.company||!a.tests)continue;
 if(CALIBRATION.some(c=>c.id===a.id||alias.get(c.id)===a.id))for(const c of CALIBRATION.filter(c=>c.id===a.id||alias.get(c.id)===a.id))calibration.set(c.id,a);
 const f=corpus<Fundamentals>(`fundamentals/${a.id}.json`),v=a.valuation;
 const t5=QUALITY_TESTS.map(k=>a.tests[k as keyof typeof a.tests].result[0].toUpperCase()).join('');
 const mos=a.requiredMos??.5,cv=a.tests.understandable.metrics.opMarginCv??null;
 const proposed=v&&f?proposeValuation({valuation:v,years:f.years,t5,cv,mos}):null;
 const quote=quotes[a.id],price=quote?.[0]??null;
 const publication=(value:Valuation|null,m:number)=>{
  const ps=value?.perShareTrading??(value?.currency.toUpperCase()===a.company.currency.toUpperCase()?value?.perShare:null);
  return publishedBuyPrice({st:a.status==='scored'?'s':'i',t:t5,v:ps?[ps.low,ps.mid,ps.high]:null,m,dataQualityFlags:[...(a.dataQualityFlags??[]),...valuationFlags({price,mid:ps?.mid??null,assumptions:value?.assumptions??[]})],buyReturnInputs:buyReturnInputs(value,a.company.currency),shareSources:value?.shareSources},quote);
 };
 const before=publication(v,mos),after=publication(proposed?.valuation??v,proposed?.mos??mos);
 current.push({id:a.id,name:a.company.name,western:bestWesternListing(a.company),t5,status:a.status,price,quoteDate:quote?.[1]??null,mos,proposalEligible:proposed?.eligible??false,baseline:scorePurchase(v,mos,price,t5),proposed:scorePurchase(proposed?.valuation??v,proposed?.mos??mos,price,t5),before:before.b,after:after.b,flags:after.dataQualityFlags});
 manifest.push({id:a.id,asOf:a.asOf,analysisHash:hash(a),fundamentalsHash:f?hash(f):null});
}
write('corpus-results.json',current);write('input-manifest.json',manifest);
write('calibration-summary.json',calibrationSummary({entries:CALIBRATION,analyses:calibration}));
const buys={scanned:current.length,quality:current.filter(r=>r.t5==='PPPPP').length,eligible:current.filter(r=>r.proposalEligible).length,before:current.filter(r=>r.before),after:current.filter(r=>r.after),added:current.filter(r=>!r.before&&r.after),removed:current.filter(r=>r.before&&!r.after)};
write('buy-zone.json',buys);console.log('Corpus summary',JSON.stringify({scanned:buys.scanned,quality:buys.quality,eligible:buys.eligible,before:buys.before.length,after:buys.after.length,added:buys.added.map(r=>r.id),removed:buys.removed.map(r=>r.id)}));
