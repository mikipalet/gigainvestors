import { marginVariation, formatMetric } from './metric-labels';
import { priceFraming } from './presentation';
import { T } from './config';
import type { Kind, Series, TestOutcome } from './types';
import type { MetricFormat } from './metric-labels';
export type TileMetric = {id:string;value:number|null;label:string;format:MetricFormat;threshold:number;better:'higher'|'lower';series:Series;chart:string;chartFormat?:'money'|'pct'|'ratio'|'index';chartThreshold?:number|null;chartBetter?:'higher'|'lower'};
/** Stable comparison contract. Other rule failures belong in the reason, never replace this metric. */
export function tileMetric(test:TestOutcome,kind:Kind,netIncome:Series=[]):TileMetric {
 const m=test.metrics, financial=kind!=='operating';
 const metric=(id:string,label:string,format:MetricFormat,threshold:number,better:'higher'|'lower',series:Series=[],chart=label):TileMetric=>({id,value:m[id]??null,label,format,threshold,better,series:series.slice(-10),chart});
 if ('positiveIncomeYears' in m) return {...metric('positiveIncomeYears','profitable years','count',m.requiredPositiveYears??9,'higher',test.series.netIncome??[],'Net income'),chartFormat:'money',chartThreshold:0};
 if ('bookReturnCagr' in m) return metric('bookReturnCagr','book + dividends CAGR','pct',.07,'higher',test.series.bookPlusDividendReturn??[],'Annual book + dividend return');
 if ('retainedBookRatio' in m) {
  const shares=(test.series.shares??[]).slice(-10),base=shares.find(([,value])=>value!==null&&value>0)?.[1];
  const indexed:Series=shares.map(([year,value])=>[year,base&&value!==null?value/base*100:null]);
  return {...metric('shareCagrExCrisis','ordinary share growth','pct',.02,'lower',indexed,'Shares (first year = 100)'),chartFormat:'index',chartThreshold:null};
 }
 if ('financialRedFlags' in m) return metric('financialRedFlags','accounting warnings','count',0,'lower');
 if ('combinedReportedYears' in m) {
  if (m.combinedProfitableYears!=null) return {...metric('combinedProfitableYears','profitable underwriting years','count',7,'higher',test.series.combinedRatio??[],'Combined ratio'),chartFormat:'pct',chartThreshold:1,chartBetter:'lower'};
  return metric('roeMedian',m.tangibleReturn?'ROTE · ten-year median':'ROE · ten-year median','pct',m.returnThreshold??.12,'higher',test.series.roe??[],'Return on common equity');
 }
 switch(test.key){
  case 'understandable': {
   const margins=test.series.operatingMargin??[];
   const available=margins.filter(p=>p[1]!==null&&Number.isFinite(p[1]));
   if(m.opMarginCv==null)return {...metric('lossYears','loss years','count',T.understandable.maxLossYears,'lower',test.series.netIncome??[],'Net income'),chartFormat:'money'};
   return metric('opMarginCv','margin variation','x',T.understandable.maxOpMarginCv,'lower',available,'Operating margin');
  }
  case 'moat':return metric(financial?'roeMedian':'roicMedian',financial?'ROE · median':'ROIC excluding acquisitions','pct',financial?T.moat.roeMedianFin:T.moat.roicMedian,'higher',test.series[financial?'roe':'roic']??[],financial?'ROE':'ROIC excluding acquisitions');
  case 'economics': {
   const income=new Map(netIncome),end=Math.max(...netIncome.map(p=>p[0]));
   const series:Series=(test.series.ownerEarnings??[]).filter(([fy])=>fy>end-10&&income.has(fy)).map(([fy,oe])=>[fy,oe===null||!income.get(fy)?null:oe/income.get(fy)!]);
   if(m.oeToNi==null && m.ownerEarningsTotal!=null)return {...metric('ownerEarningsTotal','Owner earnings, five-year total','money',0,'higher',test.series.ownerEarnings??[],'Owner earnings'),chartFormat:'money'};
   return metric('oeToNi','owner earnings / net income','x',T.economics.oeToNi,'higher',series,'Annual OE / net income');
  }
  case 'management':
   if(m.retainedEarnings!=null&&m.marketCapGain!=null&&m.retainedEarnings<=0)return metric('marketCapGain','Market value gained','money',m.retainedEarnings,'higher');
   if(m.retainedEarnings==null||m.marketCapGain==null) return {...metric(m.perShareValueGrowth!=null?'perShareValueGrowth':'perShareValueChange',m.perShareValueGrowth!=null?'per-share value growth':'per-share value change',m.perShareValueGrowth!=null?'pct':'money',0,'higher',test.series.perShareValue??[],'Per-share earnings / book value'),chartFormat:'money',chartThreshold:null};
   return {...metric('retainedDollar','value created / retained','x',1,'higher',[],'Retained → value created'),value:m.retainedEarnings!=null&&m.retainedEarnings>0&&m.marketCapGain!=null?m.marketCapGain/m.retainedEarnings:null};
  case 'accounting':return financial&&m.ocfToNi==null?metric('cashBacked','Earnings backed by cash','yesno',1,'higher'):financial?metric('ocfToNi','operating cash / earnings','x',0,'higher',test.series.ocfToNi??[],'Cash backing'):metric('accruals','Sloan accruals','pct',T.accounting.maxAccruals,'lower',test.series.accruals??[],'Sloan accruals');
  case 'price':return metric('priceToMid','price / estimated value','x',m.buyRatio??.75,'lower');
 }
}
export function tileReason(test:TestOutcome):string {
 if(test.insufficientHistory!==undefined)return 'Not enough history yet';
 if(test.key==='understandable'&&(test.metrics.opMarginCv??0)>1)return test.series.operatingMargin?.some(p=>p[1]!==null&&p[1]<0)?'Margins swing wildly, including losses.':'Margins swing wildly relative to their average.';
 if(test.result==='fail'){
   const reason=test.reasons.find(r=>!/informational|ROIC first|\$1 retained earnings test:|^Per-share .*three-year endpoint medians|^Years with nonpositive invested capital/.test(r))??'Filing-evidence rule fails';
  const short:Array<[RegExp,string]>=[[/market cap gain/,'Managers created less value than they kept.'],[/variation/,'Margins are too variable.'],[/net loss/,'Too many loss years.'],[/revenue declines/,'Too many revenue declines.'],[/worst years/,'Returns are too weak in the worst years.'],[/median below/,'Median return below the bar.'],[/incremental/,'New investments earn too little.'],[/cash conversion/,'Cash conversion below the bar.'],[/gross margin/,'Gross margin fell too far.'],[/diluted share/,'Both dilution windows fail.'],[/buybacks/,'Buyback timing fails.'],[/working capital/,'Working capital rose too far.']];
  return short.find(([pattern])=>pattern.test(reason))?.[1]??reason;
 }
 if(test.pending)return '';
 if(test.result==='unclear')return '';
 return '';
}

/** Lead with the meaning of the selected metric, without claiming that one metric passes the whole test. */
export function tileSentence(test:TestOutcome, metric:TileMetric, kind:Kind):string {
 const v=metric.value, bar=metric.threshold;
 if(test.key==='management'&&test.metrics.retainedBookRatio!=null)return `$${test.metrics.retainedBookRatio.toFixed(2)} of book value per $1 kept.`;
 if(v===null)return test.result==='fail'?tileReason(test):'';
 const pct=(n:number)=>n>1&&test.key==='moat'?'>100%':`${Math.round(n*100)}%`,num=(n:number)=>n.toFixed(2);
 if(metric.id==='positiveIncomeYears')return `Positive earnings in ${v}/10 years; ${bar} required.`;
 if(metric.id==='bookReturnCagr')return `Book value plus dividends compounded at ${pct(v)} a year.`;
 if(metric.id==='shareCagrExCrisis')return `Ordinary share count grew ${pct(v)} a year; the limit is ${pct(bar)}.`;
 if(metric.id==='financialRedFlags')return `${v} accounting warning${v===1?'':'s'}.`;
 if(metric.id==='combinedProfitableYears')return `Combined ratio below 100% in ${v}/10 years.`;
 switch(test.key){
  case 'understandable':return metric.id==='lossYears'?`${v} years recorded a net loss.`:v>1?`Margin variation ${marginVariation(v)}.`:`Margins vary by ${marginVariation(v)} of their average.`;
  case 'moat': {
   const years=metric.series.filter(p=>p[1]!==null),passes=years.filter(p=>p[1]!>=bar).length;
   return `Earns ${pct(v)} on ${kind==='operating'?(metric.id==='totalRoicMedian'?'capital including acquisitions':'capital excluding acquisitions'):'equity'}; ${years.length?`${passes}/${years.length} years ≥ ${pct(bar)}.`:`the bar is ${pct(bar)}.`}`;
  }
  case 'economics':return metric.id==='ownerEarningsTotal'?`Five-year owner earnings ${v>0?'are positive':'are nonpositive'}.`:`Each $1 of profit leaves $${num(v)} for owners.`;
  case 'management':return metric.id==='marketCapGain'?`${formatMetric({value:v,format:'money'})} of market value gained; net capital returned to owners.`:metric.id==='perShareValueGrowth'?`${pct(v)} yearly growth in per-share value.`:metric.id==='perShareValueChange'?`${num(v)} change in per-share value.`:`$${num(v)} of market value per $1 kept.`;
  case 'accounting':return metric.id==='cashBacked'?(v?'Earnings are backed by operating cash.':'Earnings are not backed by operating cash.'):kind==='operating'?(v<0?`Cash exceeds profit by ${pct(-v)} of assets.`:`Profit exceeds cash by ${pct(v)} of assets; ${pct(bar)} is the limit.`):`Operating cash covers ${num(v)}× reported earnings.`;
  case 'price':return priceFraming(v,1-bar).headline;
 }
}

/** Main dossier metric includes the price paid for acquisitions; legacy moat evidence stays in its drawer. */
export function primaryTileMetric(test:TestOutcome,kind:Kind,netIncome:Series=[]):TileMetric {
 if(test.key!=='moat'||kind!=='operating')return tileMetric(test,kind,netIncome);
 return {id:'totalRoicMedian',value:test.metrics.totalRoicMedian??null,label:'ROIC including acquisitions',format:'pct',threshold:T.valuation.compounderMinTotalReturn,better:'higher',series:test.series.totalRoic??[],chart:'ROIC including acquisitions'};
}
