import {ruleReading, type RuleCheck} from './rule-reading';
import {trustedContradictions} from './jev/combine';
import type {Kind,TestOutcome} from './types';

/** Prose is presentation; verdicts continue to come from the structured checks. */
export function plainRuleSentence(t:TestOutcome,kind:Kind):string {
 const m=t.metrics,reading=ruleReading(t,kind);
 const n=(v:number|null|undefined,digits=1)=>v==null?'unknown':Number(v.toFixed(digits)).toString();
 const pct=(v:number|null|undefined)=>v==null?'unknown':`${n(v*100)}%`;
 const money=(v:number)=>Math.abs(v)>=1e9?`${n(v/1e9)} billion`:Math.abs(v)>=1e6?`${n(v/1e6)} million`:n(v,2);
 const clause=(c:RuleCheck):string=>{
  const {key,value:v,bar}=c;
  // Preserve differences near a cutoff instead of rounding a failure to equality.
  const p=(x:number|null|undefined)=>x!=null&&v!=null&&bar!=null&&v!==bar&&pct(v)===pct(bar)?`${Number((x*100).toPrecision(7))}%`:pct(x);
  switch(key){
   case 'historyYears':return `only ${n(v)} years of history are available (at least ${n(bar)} needed)`;
   case 'positiveIncomeYears':return `profits were positive in ${n(v)} years (at least ${n(bar)} needed)`;
   case 'revenueDeclines':return `sales fell in ${n(v)} years (limit ${n(bar)})`;
   case 'lossYears':return `${v===0?'no loss years':`${n(v)} loss years`} were recorded (limit ${n(bar)})`;
   case 'opMarginCv':if(m.opMarginRecoveredDip===1)return 'one margin dip fully recovered; the remaining variation meets the limit';if(m.opMarginImproving===1)return 'margins improved consistently with no loss years';return `margins varied ${p(v)} around their average (limit ${p(bar)})`;
   case 'roicMedian':return `capital return excluding acquisitions: median ${v!=null&&v>1?'>100%':p(v)} (minimum ${p(bar)})`;
   case 'returnFloorMedian':return `the conservative return floor was ${p(v)} (minimum ${p(bar)})`;
   case 'roicSecondLowest':case 'returnFloorSecondLowest':case 'roeSecondLowest':return `the second-worst year ${p(v)} (minimum ${p(bar)})`;
   case 'roeMedian':return `earned a median ${p(v)} on ${m.tangibleReturn?'tangible ':''}equity (minimum ${p(bar)})`;
   case 'combinedProfitableYears':return `underwriting was profitable in ${n(v)} years (at least ${n(bar)} needed)`;
   case 'grossMarginDrop':return `gross margin fell ${n((v??0)*100)} percentage points (limit ${n((bar??0)*100)})`;
   case 'oeToNi':{const cash=v==null?'unknown':v!==bar&&v.toFixed(2)===bar?.toFixed(2)?String(Number(v.toPrecision(7))):v.toFixed(2);return `each $1 of ${m.consolidatedCashConversion?'consolidated ':''}profit left $${cash} ${m.consolidatedCashConversion?'of cash':'for owners'} over five years (minimum $${bar?.toFixed(2)})`;}
   case 'roiic':return `new investment earned ${p(v)} (minimum ${p(bar)})`;
   case 'bookReturnCagr':return `book value plus dividends grew ${p(v)} a year (minimum ${p(bar)})`;
   case 'shareCagrExCrisis':return `ordinary shares ${v!=null&&v<0?'shrank':'grew'} ${p(v==null?null:Math.abs(v))} a year (growth limit ${p(bar)})`;
   case 'efficiencyMedian':return `costs took ${p(v)} of income (limit ${p(bar)})`;
   case 'floatGrowth':return `insurance float ${v!=null&&v<0?'shrank':'grew'} ${p(v==null?null:Math.abs(v))} (no decline allowed)`;
   case 'accruals':return `${m.cashBacked===1&&v!=null&&v<=.1?'profits were backed by cash: ':''}accruals were ${p(v)} of assets (limit ${p(bar)})`;
   case 'dsri':return `receivables grew ${n(v,3)} times as fast as sales (limit ${n(bar,3)})`;
   case 'restructuringYears':return `special charges appeared in ${n(v)} years (limit ${n(bar)})`;
   case 'sbcToOcf':return `stock pay took ${p(v)} of cash flow (limit ${p(bar)})`;
  }
  if(c.text.startsWith('Value per $1'))return `each $1 kept became $${n(m.marketCapGain!/m.retainedEarnings!,2)} of market value (minimum $1)`;
  if(c.text.startsWith('Value gained'))return `market value ${m.marketCapGain!<0?'fell':'rose'} ${money(Math.abs(m.marketCapGain!))} after paying owners ${money(Math.abs(m.retainedEarnings!))} above profits (any decline must be smaller than that payment)`;
  if(c.text.startsWith('Per-share value'))return m.perShareStart==null||m.perShareEnd==null?'per-share value history is missing':`per-share value ${m.perShareEnd<m.perShareStart?'fell':'rose'} from ${n(m.perShareStart,2)} to ${n(m.perShareEnd,2)} (must rise and stay positive)`;
  if(c.text.startsWith('Share growth'))return `share growth was ${pct(m.nonAcquisitionShareCagr??m.shareCagr)} over ten years and ${pct(m.nonAcquisitionShareCagr5??m.shareCagr5)} over five (either must be at most 1% a year)`;
  if(c.text.startsWith('Ordinary share growth'))return `ordinary share growth was ${pct(m.shareCagrExCrisis)} over the full period and ${pct(m.shareCagr5ExCrisis)} over five years (either must be at most 2% a year)`;
  if(c.text.startsWith('Book gain'))return `book value gained ${n(m.retainedBookGain,2)} per share against ${n(Math.max(0,m.retainedPerShare??0),2)} kept (must cover the amount kept)`;
  if(c.text.startsWith('Buybacks'))return `buybacks favoured expensive years across ${n(m.buybackYears)} years (limit five), with price discipline ${n(m.buybackYieldSpearman,2)} (minimum -0.5) and spending ${pct(m.averageBuybackYield)} of value (limit 1%)`;
  if(c.text.startsWith('Acquisitions'))return `acquisitions used ${pct(m.acquisitionSpend!/m.cumulativeNetIncome!)} of profits (limit 50%) while returns fell to ${pct(m.roicLast3Median)} (minimum 15% and two-thirds of their starting level)`;
  if(c.text.startsWith('Working capital'))return `working capital rose ${pct(m.nwcToRevenueChange)} of sales (limit 10%) to ${pct(m.nwcToRevenueEnd)} (waived at zero or below)`;
  if(c.text.startsWith('Cash backing'))return m.cashBacked===0?'profits lacked the required cash backing':'cash backing has not been established';
  if(c.text.includes('accounting warnings'))return `${n(m.financialRedFlags)} accounting warnings were found (none allowed)`;
  if(c.text.startsWith('Mean margin'))return 'average operating margin was negative (must be zero or higher)';
  if(c.text.startsWith('Positive common'))return 'common shareholder capital was negative (must be positive)';
  if(c.text.startsWith('Book value nonpositive'))return 'book value was zero or negative (must stay positive)';
  if(c.text.startsWith('Common shareholder'))return 'shareholder capital was cancelled in restructuring (must be preserved)';
  if(c.text.startsWith('Five-year owner'))return `owners received ${money(m.ownerEarningsTotal??0)} over five years (must be positive)`;
  return 'the required financial history is incomplete';
 };
 const failed=reading.checks.filter(c=>c.pass===false),known=reading.checks.filter(c=>c.pass!==null);
 let selected=reading.numeric==='fail'?failed:known;
 if(reading.numeric!=='fail'){
  if(t.key==='understandable'&&m.opMarginCv!=null)selected=known.filter(c=>c.key==='opMarginCv'||c.key==='lossYears').reverse();
  else if(t.key==='moat')selected=known.filter(c=>c.key&&/Median|SecondLowest|combinedProfitableYears/.test(c.key)).slice(0,2);
  else selected=known.slice(0,1);
 }
 let clauses=selected.map(clause);
 if(reading.numeric==='unclear')clauses=['the required financial history is incomplete',...clauses.slice(0,1)];
 if(t.key==='accounting'&&m.accruals!=null&&reading.numeric==='pass'&&m.accruals>.1)clauses.push('cash still backed profits and only one warning appeared (two cause a failure)');
 const contradictions=trustedContradictions(t.jev,kind);
 if(reading.numeric==='pass'&&contradictions.length)clauses.push(`filing risk: ${contradictions.map(c=>c.label.toLowerCase().replace(/[.;]$/,'')).join(' and ')}`);
 const sentence=clauses.join(', and ')||'the required financial history is incomplete';
 return sentence[0].toUpperCase()+sentence.slice(1)+'.';
}
