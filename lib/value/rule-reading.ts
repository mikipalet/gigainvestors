import {T} from './config';
import type {Kind,Result,TestOutcome} from './types';
export interface RuleCheck {text:string;pass:boolean|null;core?:boolean;decisive?:boolean;key?:string;value?:number|null;bar?:number}
const pct=(n:number)=>`${(n*100).toFixed(1)}%`;
const num=(n:number)=>n.toFixed(2);
/** Reconstruct the applied rules from published measurements, not the chosen chart. */
export function ruleReading(t:TestOutcome,kind:Kind){
 const m=t.metrics,checks:RuleCheck[]=[];
 const add=(text:string,pass:boolean|null,core=false,decisive=false)=>checks.push({text,pass,core,decisive});
 const compare=(key:string,label:string,bar:number,high=false,core=false,format=pct)=>{
  const v=m[key];
  const fmt=(n:number)=>v!=null&&v!==bar&&format(v)===format(bar)?format===pct?`${Number((n*100).toPrecision(7))}%`:String(Number(n.toPrecision(7))):format(n);
  add(v==null?`${label}: no observation`:`${label} ${fmt(v)} ${high?(v>=bar?'≥':'<'):(v<=bar+Number.EPSILON?'≤':'>')} ${fmt(bar)}`,v==null?null:high?v>=bar:v<=bar+Number.EPSILON,core);
  Object.assign(checks.at(-1)!,{key,value:v??null,bar});
 };
 let minFailures=1;
 if(m.positiveIncomeYears!=null){compare('positiveIncomeYears','Profitable years',m.requiredPositiveYears??9,true,true,String);}
 else if(m.bookReturnYears!=null||'bookReturnCagr' in m){compare('bookReturnCagr','Book + dividends / year',.07,true,true);if(Object.values(t.series.bookPerShare??[]).some(p=>p[1]!=null&&p[1]<=0))add('Book value nonpositive in the window',false,true);}
 else if('retainedBookGain' in m||'shareCagrExCrisis' in m){
  if('shareCagr5ExCrisis' in m){
   const rates=[m.shareCagrExCrisis,m.shareCagr5ExCrisis],known=rates.filter((v):v is number=>v!=null);
   add(`Ordinary share growth ${rates.map(v=>v==null?'—':pct(v)).join(' / ')} (full / 5y); either ≤2%`,known.some(v=>v<=.02+Number.EPSILON)?true:known.length<2?null:false,true);
  }else compare('shareCagrExCrisis','Ordinary shares / year',.02,false,true);
  const kept=m.retainedPerShare,gain=m.retainedBookGain;
  add(kept!=null&&gain!=null?`Book gain ${num(gain)} ${gain>=Math.max(0,kept)?'≥':'<'} ${num(Math.max(0,kept))} retained per share`:'Book gain / retained: no observation',kept==null||gain==null?null:kept<=0?gain>=0:gain+1e-9*Math.max(1,Math.abs(kept))>=kept,true);
 }else if('financialRedFlags' in m){
  add(`${m.financialRedFlags} accounting warnings; none allowed`,m.financialRedFlags===0,true);
 }else if('combinedReportedYears' in m){
  // Positive common capital is the core prerequisite in the financial model.
  add('Positive common capital',t.reasons.includes('nonpositive common capital')?false:true,true);
  if(m.combinedProfitableYears!=null)compare('combinedProfitableYears','Profitable underwriting years',7,true,true,String);
  else compare('roeMedian',m.tangibleReturn?'Tangible ROE median':'ROE median',m.returnThreshold??.12,true,true);
  if(kind==='bank')compare('roeSecondLowest','Second-lowest ROE (one bad year allowed)',.05,true,true);
  if(kind==='bank'&&m.efficiencyMedian!=null)compare('efficiencyMedian','Cost / income',.65);
  if(kind!=='bank'&&m.floatGrowth!=null)compare('floatGrowth','Float growth',0,true);
 }else switch(t.key){
  case 'understandable':
   compare('historyYears','History years',T.minYears,true,false,String);
   compare('revenueDeclines','Sales declines',T.understandable.maxRevenueDeclines,false,false,String);
   compare('lossYears','Loss years',T.understandable.maxLossYears,false,true,String);
   {const margins=(t.series.operatingMargin??[]).flatMap(p=>p[1]==null?[]:[p[1]]),average=margins.reduce((a,b)=>a+b,0)/margins.length;
   add(`Mean margin ${pct(average)} ${average>=0?'≥':'<'} 0%`,margins.length<5?null:average>=0,true);
   compare('opMarginCv','Margin variation',T.understandable.maxOpMarginCv,false,average>0,num);}
   break;
  case 'moat':
   compare(m.roicMedian!=null?'roicMedian':'returnFloorMedian',m.roicMedian!=null?'ROIC ex acquisitions median':'Conservative return floor median',.15,true,true);
   compare(m.roicSecondLowest!=null?'roicSecondLowest':'returnFloorSecondLowest','Second-lowest return (one bad year allowed)',.10,true,true);
   compare('grossMarginDrop','Gross-margin drop',.04);
   break;
  case 'economics':
   if(m.oeToNi!=null)compare('oeToNi','Cash per $1 profit',.8,true,true,num);
   else add(`Five-year owner earnings ${m.ownerEarningsTotal!=null?num(m.ownerEarningsTotal):'no observation'}; must be positive`,m.ownerEarningsTotal==null?null:m.ownerEarningsTotal>0,true);
   compare('roiic','Incremental return',.12,true);
   if(kind==='operating')add(m.nwcToRevenueEnd!=null&&m.nwcToRevenueChange!=null?`Working capital ${pct(m.nwcToRevenueEnd)} of sales; rise ${pct(m.nwcToRevenueChange)} (≤10% or end ≤0%)`:'Working capital: no observation',m.nwcToRevenueEnd==null||m.nwcToRevenueChange==null?null:m.nwcToRevenueEnd<=0||m.nwcToRevenueChange<=.1+Number.EPSILON);
   break;
  case 'management': {
   const gain=m.marketCapGain,kept=m.retainedEarnings;
   if(gain!=null&&kept!=null)add(kept>0?`Value per $1 kept ${num(gain/kept)} ${gain>=kept?'≥':'<'} $1`:`Value gained ${num(gain)} ${gain>=kept?'≥':'<'} retained ${num(kept)}`,gain>=kept,true);
   else add(m.perShareStart!=null&&m.perShareEnd!=null?`Per-share value ${num(m.perShareStart)} → ${num(m.perShareEnd)}; must rise and end positive`:'Per-share value: no observation',m.perShareValueChange==null?null:m.perShareEnd!>0&&m.perShareValueChange>=0,true);
   const rates=[m.nonAcquisitionShareCagr??m.shareCagr,m.nonAcquisitionShareCagr5??m.shareCagr5],known=rates.filter((v):v is number=>v!=null);
   add(`Share growth ${rates.map(v=>v==null?'—':pct(v)).join(' / ')} (10y / 5y); either ≤1%`,known.some(v=>v<=.01+Number.EPSILON)?true:known.length<2?null:false);
   const blind=(m.buybackYears??0)>=6&&m.buybackYieldSpearman!=null&&m.buybackYieldSpearman<-.5&&(m.averageBuybackYield??0)>.01;
   add(`Buybacks: ${m.buybackYears??0} years, correlation ${m.buybackYieldSpearman==null?'—':num(m.buybackYieldSpearman)}, yield ${pct(m.averageBuybackYield??0)}; fails at ≥6 years, <−0.5 and >1%`,blind?false:m.buybackYears!>0||(t.series.buybacks??[]).some(p=>p[1]===0)?true:null);
   const spend=m.acquisitionSpend,income=m.cumulativeNetIncome,first=m.roicFirst3Median,last=m.roicLast3Median;
   add(`Acquisitions ${spend==null||income==null?'—':num(spend)+' / '+num(income)} of profits; ROIC ${first==null?'—':pct(first)} → ${last==null?'—':pct(last)}. Fails if spend >50% and ROIC <15% and <⅔ of start`,spend==null||income==null?null:spend<=.5*income?true:first==null||last==null?null:!(last<.15&&last<2/3*first));
   if(t.reasons.some(r=>r.includes('Common shareholder capital was cancelled')))add('Common shareholder capital cancelled in restructuring',false,true,true);
   break;
  }
  case 'accounting':
   minFailures=2;
   compare('accruals','Accruals / assets',.1,false,true);
   compare('dsri','Receivables index',1.465,false,false,num);
   compare('restructuringYears','Charge years',2,false,false,String);
   compare('sbcToOcf','Stock pay / cash flow',.15);
   add(`Cash backing ${m.cashBacked===1?'yes':m.cashBacked===0?'no':'no observation'}; required`,m.cashBacked==null?null:m.cashBacked===1,true,true);
   break;
 }
 const failed=checks.filter(c=>c.pass===false),known=checks.filter(c=>c.pass!==null),core=checks.filter(c=>c.core);
 const numeric:Result=failed.some(c=>c.decisive)||failed.length>=minFailures?'fail':core.some(c=>c.pass===null)?'unclear':core.length||known.length/checks.length>=T.numeric.minAvailableFraction?'pass':'unclear';
 const derived:Result=numeric;
 const applicable=known.length;
 const selected=failed.length>=minFailures||failed.some(c=>c.decisive)?failed:known;
 // Primary rule plus an explicit count/allowance keeps all five tiles readable.
 const lead=t.key==='moat'?selected.slice(0,2).map(c=>c.text).join('; '):t.key==='understandable'&&numeric==='pass'&&m.opMarginCv!=null?selected.filter(c=>/^Margin variation|^Loss years/.test(c.text)).map(c=>c.text).join('; '):selected[0]?.text??'';
 const allowance=minFailures===2?`; ${failed.length} warnings (2 fail; cash backing required)`:`; ${known.filter(c=>c.pass).length}/${applicable} applied checks met`;
 const sentence=`${lead}${allowance}.`;
 return {checks,numeric,derived,sentence};
}
