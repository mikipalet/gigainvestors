import {plainRuleSentence} from './plain-rule-sentence';
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
  const shares=m.crisisRecapitalizations?[]:(test.series.shares??[]),base=shares.find(([,value])=>value!==null&&value>0)?.[1];
  const indexed:Series=shares.map(([year,value])=>[year,base&&value!==null?value/base*100:null]);
  const recent=m.shareCagr5ExCrisis!=null&&m.shareCagr5ExCrisis<=.02+Number.EPSILON&&(m.shareCagrExCrisis==null||m.shareCagrExCrisis>.02+Number.EPSILON);
  return {...metric(recent?'shareCagr5ExCrisis':'shareCagrExCrisis',recent?'five-year ordinary share growth':'ordinary share growth','pct',.02,'lower',indexed,'Shares (first year = 100)'),series:indexed,chartFormat:'index',chartThreshold:null};
 }
 if ('financialRedFlags' in m) return metric('financialRedFlags','accounting warnings','count',0,'lower');
 if ('combinedReportedYears' in m) {
  if (m.combinedProfitableYears!=null) return {...metric('combinedProfitableYears','profitable underwriting years','count',7,'higher',test.series.combinedRatio??[],'Combined ratio'),chartFormat:'pct',chartThreshold:1,chartBetter:'lower'};
  return metric('roeMedian',m.tangibleReturn?'ROTE · ten-year median':'ROE · ten-year median','pct',m.returnThreshold??.12,'higher',test.series.roe??[],m.tangibleReturn?'Return on tangible common equity':'Return on common equity');
 }
 switch(test.key){
  case 'understandable': {
   const margins=test.series.operatingMargin??[];
   const available=margins.filter(p=>p[1]!==null&&Number.isFinite(p[1]));
   if(m.opMarginCv==null)return {...metric('lossYears','loss years','count',T.understandable.maxLossYears,'lower',test.series.netIncome??[],'Net income'),chartFormat:'money',chartThreshold:0,chartBetter:'higher'};
   return metric('opMarginCv','margin variation','x',T.understandable.maxOpMarginCv,'lower',available,'Operating margin');
  }
  case 'moat':
   if(!financial&&m.roicMedian==null&&m.returnFloorMedian!=null)return metric('returnFloorMedian','Conservative return floor','pct',T.moat.roicMedian,'higher');
   return metric(financial?'roeMedian':'roicMedian',financial?'ROE · median':'ROIC excluding acquisitions','pct',financial?T.moat.roeMedianFin:T.moat.roicMedian,'higher',test.series[financial?'roe':'roic']??[],financial?'ROE':'ROIC excluding acquisitions');
  case 'economics': {
   netIncome=test.series.netIncome??netIncome;
   const income=new Map(netIncome),end=Math.max(...(test.series.ownerEarnings??[]).map(p=>p[0]));
   const series:Series=(test.series.ownerEarnings??[]).filter(([fy])=>fy>end-5&&income.has(fy)).map(([fy,oe])=>[fy,oe===null||!income.get(fy)?null:oe/income.get(fy)!]);
   if(m.oeToNi==null && m.ownerEarningsTotal!=null)return {...metric('ownerEarningsTotal','Owner earnings, five-year total','money',0,'higher',m.consolidatedCashConversion?[]:(test.series.ownerEarnings??[]).slice(-5),'Owner earnings · five years'),chartFormat:'money'};
   return metric('oeToNi',m.consolidatedCashConversion?'consolidated cash / profit':'owner cash / profit','x',T.economics.oeToNi,'higher',m.consolidatedCashConversion?[]:series,'Annual owner cash / profit · five years');
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
 if(test.insufficientHistory!==undefined)return 'Not enough history yet';
 if(test.key==='price')return priceFraming(metric.value,1-metric.threshold).headline;
 if(test.result==='unclear'||test.result==='na')return '';
 return plainRuleSentence(test,kind);
}

/** One primary comparison for the dossier tile, drawer, and annual bar. */
export function primaryTileMetric(test:TestOutcome,kind:Kind,netIncome:Series=[]):TileMetric {
 return tileMetric(test,kind,netIncome);
}
