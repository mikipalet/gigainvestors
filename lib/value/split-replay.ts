import {cagr,mean,median,spearman} from './metrics';
import {ruleReading} from './rule-reading';
import {numericJudgementReason} from './judgement/apply';
import type {Dossier,Series,TestOutcome,Year} from './types';

/** Explicit dependency boundary for a unit repair. Unknown fields are protected. */
export const splitSeries = new Set(['shares','marketCap','perShareValue','revenuePerShare','ownerEarningsPerShare','bookValuePerShare','tangibleBookValuePerShare','navPerShare','bookPerShare','dividendsPerShare','bookPlusDividendReturn']);
export const splitMetrics = new Set(['shareCagr','shareCagr5','nonAcquisitionShareCagr','nonAcquisitionShareCagr5','shareCagrExCrisis','shareCagr5ExCrisis','perShareStart','perShareEnd','perShareValueChange','perShareValueGrowth','marketCapGain','buybackYieldSpearman','averageBuybackYield','buybackYears','bookReturnCagr','bookStartPerShare','bookEndPerShare','retainedBookGain','retainedPerShare','retainedBookRatio']);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);

/** Fail closed: even an otherwise plausible source refresh cannot enter a split release. */
export function nonShareDifferences(before:Dossier,after:Dossier):string[]{
 const differences:string[]=[];
 const compare=(a:Record<string,unknown>,b:Record<string,unknown>,prefix:string,allowed:Set<string>)=>{
  for(const k of new Set([...Object.keys(a),...Object.keys(b)]))if(!allowed.has(k)&&!same(a[k],b[k]))differences.push(`${prefix}.${k}`);
 };
 compare(before.series,after.series,'series',splitSeries);
 for(const question of new Set([...(before.ownerMemo?.lines??[]),...(after.ownerMemo?.lines??[])].map(l=>l.question))){
  const a=before.ownerMemo?.lines.find(l=>l.question===question),b=after.ownerMemo?.lines.find(l=>l.question===question);
  // Removing an empty chart with a stale sentence removes no observations.
  const points=(line:typeof a)=>line?.chart?.points??[];
  const perShare=[a,b].some(l=>/per share/i.test(l?.chart?.label??''));
  if(!perShare&&!same(points(a),points(b)))differences.push(`ownerMemo.question${question}.chart`);
  if(!same(a?.capitalAllocation,b?.capitalAllocation))differences.push(`ownerMemo.question${question}.capitalAllocation`);
 }
 for(const key of new Set([...Object.keys(before.tests),...Object.keys(after.tests)])){
  const a=before.tests[key as keyof Dossier['tests']],b=after.tests[key as keyof Dossier['tests']];
  if(!a||!b){differences.push(`tests.${key}`);continue;}
  compare(a.series,b.series,`tests.${key}.series`,splitSeries);
  compare(a.metrics,b.metrics,`tests.${key}.metrics`,key==='price'?new Set(['mos']):splitMetrics);
  compare(a.rawMetrics??{},b.rawMetrics??{},`tests.${key}.rawMetrics`,splitMetrics);
 }
 // The latest denominator is the anchor: this replay never reprices today's
 // valuation or changes its total earnings, cash, capital, rates or growth.
 if(!same(before.valuation,after.valuation))differences.push('valuation');
 for(const key of ['requiredMos','volatility','historyCoverage','reportingCurrency'] as const)if(!same(before[key],after[key]))differences.push(key);
 return differences;
}

/** Scale the published observations, not newly fetched/recompleted statements.
 * This preserves every numerator and every unrelated test exactly as released. */
export function applyPublishedSplitFactors(dossier:Dossier,factors:Map<number,number>,financialYears:Year[]=[]):Dossier {
 const d=structuredClone(dossier),factor=(fy:number)=>factors.get(fy)??1;
 const lastFy=d.historyCoverage?.last??d.tests.management.series.shares?.at(-1)?.[0];
 if(lastFy!=null&&factor(lastFy)!==1)throw Error(`${d.id}: latest share anchor changed`);
 const scale=(key:string,points:Series):Series=>points.map(([fy,value])=>[fy,value==null||factor(fy)===1?value:key==='shares'||key==='marketCap'?value*factor(fy):value/factor(fy)]);
 const scaled=(series:Record<string,Series>)=>Object.fromEntries(Object.entries(series).map(([key,points])=>[key,splitSeries.has(key)&&key!=='bookPlusDividendReturn'?scale(key,points):points]));
 d.series=scaled(d.series);
 d.valueHistory=d.valueHistory?.map(([fy,low,mid,high])=>factor(fy)===1?[fy,low,mid,high]:[fy,low/factor(fy),mid/factor(fy),high/factor(fy)]);
 const management=d.tests.management;
 for(const t of Object.values(d.tests))t.series=scaled(t.series);
 const put=(t:TestOutcome,key:string,value:number|null)=>{if(key in t.metrics){if(value==null)delete t.metrics[key];else t.metrics[key]=value;}};
 const refresh=(t:TestOutcome)=>{
  const old=dossier.tests[t.key as keyof Dossier['tests']];
  if(!old||same(old.metrics,t.metrics)&&same(old.series,t.series))return;
  const result=ruleReading(t,d.company.kind).derived;
  t.numeric=result;t.result=result;
  // Render the rule from the same updated metrics; retain filing-backed prose
  // unless its former outcome no longer describes the numbers.
  t.reasons=[ruleReading(t,d.company.kind).sentence];
  if(t.rawMetrics)for(const k of splitMetrics)if(k in t.metrics&&k in t.rawMetrics)t.rawMetrics[k]=t.metrics[k];
  if(t.rawNumeric)t.rawNumeric=result;
  if(t.judgement)t.judgement={...t.judgement,result,reason:numericJudgementReason(t),override:false};
 };
 const sh=management.series.shares??[],end=sh.at(-1)?.[0];
 if(end!=null){
  for(const [key,years]of [['shareCagr',10],['shareCagr5',5],['nonAcquisitionShareCagr',10],['nonAcquisitionShareCagr5',5]] as const){
   const old=management.metrics[key];
   if(old!=null&&factor(end)!==factor(end-years))put(management,key,Math.pow(Math.pow(1+old,years)*factor(end)/factor(end-years),1/years)-1);
  }
 }
 if('bookReturnCagr' in d.tests.economics.metrics){
  const economics=d.tests.economics,books=economics.series.bookPerShare,dividends=new Map(economics.series.dividendsPerShare??[]);
  if(books&&books.some(([fy])=>factor(fy)!==1)){
   const returns:Series=books.slice(1).map(([fy,book],i)=>{const previous=books[i][1],dividend=dividends.get(fy);return [fy,book!=null&&previous!=null&&previous>0&&dividend!=null?(book+dividend)/previous-1:null];});
   economics.series.bookPlusDividendReturn=returns;
   put(economics,'bookStartPerShare',books[0][1]);put(economics,'bookEndPerShare',books.at(-1)![1]);
   put(economics,'bookReturnCagr',returns.every(([,n])=>n!=null)?Math.exp(returns.reduce((s,[,n])=>s+Math.log(1+n!),0)/returns.length)-1:null);
   const beforeShares=new Map(dossier.tests.management.series.shares);
   const years=financialYears.filter(y=>beforeShares.has(y.fy)&&y.fy>books[0][0]);
   const retained=years.map(y=>{const shares=beforeShares.get(y.fy)!;return {fy:y.fy,value:shares?((y.commonNetIncome??y.netIncome??0)-(y.commonDividendsPaid??y.dividendsPaid??0)-(y.buybacks??0))/shares:NaN};});
   const total=retained.reduce((s,r)=>s+r.value,0),published=dossier.tests.management.metrics.retainedPerShare;
   if(published==null||retained.length!==books.length-1||Math.abs(total-published)>1e-8*Math.max(1,Math.abs(published)))throw Error(`${d.id}: retained per-share inputs do not reproduce live (${total} vs ${published}); source refresh blocked`);
   const kept=retained.reduce((s,r)=>s+r.value/factor(r.fy),0),gain=books.at(-1)![1]!-books[0][1]!;
   put(management,'retainedPerShare',kept);put(management,'retainedBookGain',gain);put(management,'retainedBookRatio',kept===0?null:gain/kept);
   const first=sh[0],last=sh.at(-1)!;
   put(management,'shareCagr',cagr({first:first[1],last:last[1],years:last[0]-first[0]}));
   const ordinary=sh.slice(1).flatMap(([fy,n],i)=>[2008,2009].includes(fy)&&dossier.tests.management.series.shares[i][1]!>0&&dossier.tests.management.series.shares[i+1][1]!/dossier.tests.management.series.shares[i][1]!>1.1?[]:[n!/sh[i][1]!]);
   put(management,'shareCagrExCrisis',Math.exp(ordinary.reduce((s,n)=>s+Math.log(n),0)/ordinary.length)-1);
   if('shareCagr5ExCrisis' in management.metrics){
    const recent=sh.filter(([fy])=>fy>=last[0]-5);
    const factors=recent.slice(1).flatMap(([fy,n],i)=>{const at=sh.findIndex(p=>p[0]===fy);return [2008,2009].includes(fy)&&dossier.tests.management.series.shares[at-1][1]!>0&&dossier.tests.management.series.shares[at][1]!/dossier.tests.management.series.shares[at-1][1]!>1.1?[]:[n!/recent[i][1]!];});
    put(management,'shareCagr5ExCrisis',recent.length===6&&recent.every(([fy,n],i)=>n!=null&&n>0&&(!i||fy===recent[i-1][0]+1))&&factors.length?Math.exp(factors.reduce((s,n)=>s+Math.log(n),0)/factors.length)-1:null);
   }
   refresh(economics);
  }
 }else{
  const values=management.series.perShareValue;
  if(values&&values.some(([fy])=>factor(fy)!==1)){
   let start=values.length;while(start>0&&values[start-1][1]!=null&&(start===values.length||values[start][0]===values[start-1][0]+1))start--;
   const window=values.slice(start),a=window.length>=7?median(window.slice(0,3).map(p=>p[1]!)):null,b=window.length>=7?median(window.slice(-3).map(p=>p[1]!)):null;
   put(management,'perShareStart',a);put(management,'perShareEnd',b);put(management,'perShareValueChange',a!=null&&b!=null?b-a:null);put(management,'perShareValueGrowth',cagr({first:a,last:b,years:window.length-3}));
  }
  const caps=management.series.marketCap;
  if(caps&&caps.some(([fy])=>factor(fy)!==1)){
   const byYear=new Map(caps),m=management.metrics,a=byYear.get(m.retainedStartFy!),b=byYear.get(m.retainedEndFy!);
   if(a!=null&&b!=null)put(management,'marketCapGain',b-a);
   const income=new Map(d.tests.understandable?.series.netIncome??[]),buybacks=management.series.buybacks??[];
   const paired=buybacks.flatMap(([fy,buy])=>{const cap=byYear.get(fy),ni=income.get(fy);return cap!=null&&cap>0&&buy!=null&&buy>0&&ni!=null?[[buy/cap,ni/cap] as [number,number]]:[];});
   if(buybacks.length){put(management,'buybackYears',paired.length);put(management,'averageBuybackYield',mean(paired.map(p=>p[0])));put(management,'buybackYieldSpearman',spearman(paired));}
  }
 }
 refresh(management);
 for(const t of Object.values(d.tests))for(const [key,points]of Object.entries(t.series))if(splitSeries.has(key)&&key in d.series)d.series[key]=points;
 // Memo charts which show a canonical per-share series use that same repair.
 for(const line of d.ownerMemo?.lines??[]){if(!line.chart)continue;const key=Object.keys(dossier.series).find(k=>splitSeries.has(k)&&same(dossier.series[k],line.chart!.points));if(key)line.chart.points=d.series[key];}
 const diffs=nonShareDifferences(dossier,d);if(diffs.length)throw Error(`${d.id}: non-share mutation: ${diffs.join(', ')}`);
 return d;
}
