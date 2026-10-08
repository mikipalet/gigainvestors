import type {Dossier,Series,TestOutcome} from './types';
import {primaryTileMetric} from './tile-metric';
import type {MetricFormat} from './metric-labels';

export function retainedWindow(test:TestOutcome){
 const m=test.metrics;
 return m.economicProgressBasis===1||m.retainedEarnings==null||m.marketCapGain==null?null:{start:m.retainedStartFy,end:m.retainedEndFy,retained:m.retainedEarnings,created:m.marketCapGain};
}
export function retainedSentence(test:TestOutcome,currency:string){
 const w=retainedWindow(test);if(!w)return null;
 const money=(n:number)=>`${currency} ${Number((Math.abs(n)/1e9).toPrecision(3))}bn`;
 const result=test.result==='pass'?'passes':test.result==='fail'?'fails':'assessment continues';
 if(w.retained<0)return `Returned ${money(w.retained)} more than it earned to owners while market value ${w.created>=0?'rose':'fell'} ${money(w.created)}: ${result}.`;
 return `Kept ${money(w.retained)} and market value ${w.created>=0?'rose':'fell'} ${money(w.created)}: ${result}.`;
}
export type YearColumn={key:string;label:string;format:MetricFormat;series:Series};
export function yearTable(dossier:Dossier,test:TestOutcome){
 const income=dossier.tests.understandable.series.netIncome??dossier.series.netIncome??[];
 const metric=primaryTileMetric(test,dossier.company.kind,income),s={...dossier.series,...test.series};
 const col=(key:string,label:string,format:MetricFormat):YearColumn=>({key,label,format,series:s[key]??[]});
 const shares=s.shares??[];
 const shareGrowth:YearColumn={key:'shareGrowth',label:'Share growth',format:'pct',series:shares.map(([fy,n])=>{const prev=shares.find(p=>p[0]===fy-1)?.[1];return [fy,n!=null&&prev!=null&&prev>0?n/prev-1:null];})};
 const candidates:Record<string,YearColumn[]>={
  understandable:[col('netIncome','Earnings','money'),col('operatingMargin','Op. margin','pct'),col('revenue','Revenue','money'),col('commonRoe','ROE','pct')],
  moat:[col('totalRoic','ROIC incl. acq.','pct'),col('roic','ROIC ex. acq.','pct'),col('roe','ROTE / ROE','pct'),col('grossMargin','Gross margin','pct'),col('netIncome','Earnings','money')],
  economics:metric.id==='bookReturnCagr'?[col('bookPerShare','Book / share','money'),col('dividendsPerShare','Dividend','money'),col('bookPlusDividendReturn','Book return','pct')]:[col('ownerEarnings','Owner cash','money'),col('netIncome','Earnings','money'),...(metric.id==='oeToNi'?[{key:'conversion',label:'Cash / earnings',format:'x' as const,series:metric.series}]:[]),col('nwcToRevenue','Working capital / sales','pct')],
  management:retainedWindow(test)?[col('marketCap','Market value','money'),col('retainedEarnings','Profit − div.','money'),col('buybacks','Buybacks','money'),shareGrowth]:[col('shares','Diluted shares','count'),col('bookPerShare','Book / share','money'),col('perShareValue','Value / share','money'),shareGrowth],
  accounting:metric.id==='financialRedFlags'?[col('netIncome','Earnings','money'),col('roe','ROTE / ROE','pct')]:[col('accruals','Accruals','pct'),col('ocfToNi','Cash / earnings','x'),col('sbcToOcf','SBC / cash','pct')],
 };
 const columns=(candidates[test.key]??[]).filter(c=>c.series.some(p=>p[1]!=null)).slice(0,test.key==='moat'&&dossier.company.kind==='operating'?3:4);
 // The checklist is a rolling ten-year test; management/book returns include their opening baseline.
 const end=Math.max(...Object.values(test.series).flat().map(p=>p[0]),...metric.series.map(p=>p[0]));
 const allYears=[...new Set(columns.flatMap(c=>c.series.map(p=>p[0])))].sort((a,b)=>a-b);
 const latest=Number.isFinite(end)?end:allYears.at(-1)??0;
 const start=retainedWindow(test)?.start??latest-(test.key==='management'||metric.id==='bookReturnCagr'?10:9);
 const years=allYears.filter(y=>y>=start&&y<=latest);
 const rows=years.map(year=>{
  const values=columns.map(c=>c.series.find(p=>p[0]===year)?.[1]??null);
  const v=metric.series.find(p=>p[0]===year)?.[1];let pass:boolean|null=null;
  // A mark describes only an annual bar, never substitutes for a multi-year verdict.
  if(v!=null&&Number.isFinite(v)&&metric.chartThreshold!==null&&metric.id!=='opMarginCv'){
   const bar=metric.chartThreshold??metric.threshold;
   pass=(metric.chartBetter??metric.better)==='higher'?v>=bar:v<bar;
  }
  if(test.key==='understandable'){const n=s.netIncome?.find(p=>p[0]===year)?.[1];pass=n==null?null:n>0;}
  if(test.key==='management'){const growth=shareGrowth.series.find(p=>p[0]===year)?.[1];pass=growth==null?null:growth<=.02;}
  return {year,values,pass};
 });
 const markLabel=test.key==='management'?'Share growth ≤ 2%':test.key==='understandable'?'Profit > 0':metric.id==='financialRedFlags'||retainedWindow(test)||metric.chartThreshold===null?'Window test':'Annual bar';
 return {columns,rows,markLabel};
}
