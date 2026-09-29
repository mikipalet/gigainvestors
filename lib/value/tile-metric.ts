import { priceFraming } from './presentation';
import { T } from './config';
import type { Kind, Series, TestOutcome } from './types';
import type { MetricFormat } from './metric-labels';
export type TileMetric = {id:string;value:number|null;label:string;format:MetricFormat;threshold:number;better:'higher'|'lower';series:Series;chart:string};
/** Stable comparison contract. Other rule failures belong in the reason, never replace this metric. */
export function tileMetric(test:TestOutcome,kind:Kind,netIncome:Series=[]):TileMetric {
 const m=test.metrics, financial=kind!=='operating';
 const metric=(id:string,label:string,format:MetricFormat,threshold:number,better:'higher'|'lower',series:Series=[],chart=label):TileMetric=>({id,value:m[id]??null,label,format,threshold,better,series:series.slice(-10),chart});
 switch(test.key){
  case 'understandable': {
   const margins=test.series.operatingMargin??[];
   const variation:Series=margins.map(([fy],i)=>{const values=margins.slice(Math.max(0,i-9),i+1).flatMap(p=>p[1]===null?[]:[p[1]]);const mean=values.reduce((a,b)=>a+b,0)/values.length;return [fy,values.length<5||mean<=0?null:Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length)/mean];});
   return metric('opMarginCv','margin variation','x',T.understandable.maxOpMarginCv,'lower',variation,'Margin variation');
  }
  case 'moat':return metric(financial?'roeMedian':'roicMedian',financial?'ROE · ten-year median':'ROIC · ten-year median','pct',financial?T.moat.roeMedianFin:T.moat.roicMedian,'higher',test.series[financial?'roe':'roic']??[],financial?'ROE':'ROIC');
  case 'economics': {
   const income=new Map(netIncome),end=Math.max(...netIncome.map(p=>p[0]));
   const series:Series=(test.series.ownerEarnings??[]).filter(([fy])=>fy>end-10&&income.has(fy)).map(([fy,oe])=>[fy,oe===null||!income.get(fy)?null:oe/income.get(fy)!]);
   return metric('oeToNi','owner earnings / net income','x',T.economics.oeToNi,'higher',series,'Annual OE / net income');
  }
  case 'management':return {...metric('retainedDollar','value created / retained','x',1,'higher',[],'Retained → value created'),value:m.retainedEarnings!=null&&m.retainedEarnings>0&&m.marketCapGain!=null?m.marketCapGain/m.retainedEarnings:null};
  case 'accounting':return metric(financial?'sbcToOcf':'accruals',financial?'SBC / operating cash flow':'Sloan accruals','pct',financial?T.accounting.maxSbcToOcf:T.accounting.maxAccruals,'lower',test.series[financial?'sbcToOcf':'accruals']??[],financial?'SBC / cash flow':'Sloan accruals');
  case 'price':return metric('priceToMid','price / estimated value','x',m.buyRatio??.75,'lower');
 }
}
export function tileReason(test:TestOutcome):string {
 if(test.result==='fail'){
  const reason=test.reasons.find(r=>!/informational|ROIC first|\$1 retained earnings test:/.test(r))??'Filing-evidence rule fails';
  const short:Array<[RegExp,string]>=[[/market cap gain/,'Fails the $1 retained test.'],[/variation/,'Margins are too variable.'],[/net loss/,'Too many loss years.'],[/revenue declines/,'Too many revenue declines.'],[/worst years/,'Weak returns in bad years.'],[/median below/,'Median return below the bar.'],[/incremental/,'Reinvestment return too low.'],[/cash conversion/,'Cash conversion below the bar.'],[/gross margin/,'Gross margin fell too far.'],[/diluted share/,'Both dilution windows fail.'],[/buybacks/,'Buyback timing fails.'],[/working capital/,'Working capital rose too far.']];
  return short.find(([pattern])=>pattern.test(reason))?.[1]??reason;
 }
 if(test.pending)return 'Price history is being checked.';
 if(test.result==='unclear')return 'Evidence incomplete; no verdict.';
 return '';
}

/** Lead with the meaning of the selected metric, without claiming that one metric passes the whole test. */
export function tileSentence(test:TestOutcome, metric:TileMetric, kind:Kind):string {
 const v=metric.value, bar=metric.threshold;
 if(v===null)return test.pending?'The evidence is still being checked.':'There is not enough evidence to judge this test.';
 const pct=(n:number)=>`${Math.round(n*100)}%`,num=(n:number)=>n.toFixed(2);
 switch(test.key){
  case 'understandable':return v<=bar?'Profit margins have stayed steady over time.':'Profit margins vary too much to call this predictable.';
  case 'moat': {
   const years=metric.series.filter(p=>p[1]!==null),passes=years.filter(p=>p[1]!>=bar).length;
   return `Earns ${pct(v)} on ${kind==='operating'?'invested money':'equity'}; ${years.length?`${passes}/${years.length} years clear the bar.`:`the bar is ${pct(bar)}.`}`;
  }
  case 'economics':return `Each $1 of profit leaves $${num(v)} for owners.`;
  case 'management':return `$${num(v)} of market value created per $1 kept.`;
  case 'accounting':return kind==='operating'?(v<0?`Cash exceeds profit by ${pct(-v)} of assets.`:`Profit exceeds cash by ${pct(v)} of assets; ${pct(bar)} is the limit.`):`Stock pay uses ${pct(v)} of operating cash; the limit is ${pct(bar)}.`;
  case 'price':return priceFraming(v,1-bar).headline;
 }
}
