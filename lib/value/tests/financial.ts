import { cagr, last, mean, median, outcome, present, ratio, sum, type Check } from '../metrics';
import type { NumericInput, NumericOutcome, Year } from '../types';

// Sector fields are optional. Never interpret their absence as a measured zero.
export const commonIncome = (y: Year) => y.commonNetIncome ?? y.netIncome;
export const commonBook = (y: Year) => y.equity === null ? null : y.equity - (y.preferredEquity ?? 0);
export function tangibleCommonBook(y: Year): number | null {
 const book=commonBook(y);
 return book===null ? null : book-(y.goodwill??0)-(y.intangibles??0);
}
const perShare=(n:number|null,y:Year)=>ratio(n,y.dilutedShares);
const rate=(a:number|null|undefined,b:number|null|undefined)=>a==null||b==null||b<=0?null:a/b-1;
const known=(n:number|null|undefined):n is number=>n!=null&&Number.isFinite(n);

/** The same five questions, expressed in financial-company capital and risk terms. */
export function financialTests({years,kind,industry}:NumericInput):Record<Exclude<NumericOutcome['key'],'price'>,NumericOutcome> {
 const history=last(years,11),ys=last(history,10),end=ys.at(-1),first=history[0];
 const bank=kind==='bank';
 const complete=history.length===11&&history.every((y,i)=>!i||y.fy===history[i-1].fy+1);
 const book=(y:Year)=>bank?tangibleCommonBook(y):commonBook(y);
 const books=history.map(y=>perShare(book(y),y));
 const combined=ys.map(y=>y.combinedRatio??null),combinedCount=present(combined).length;
 const pc=/property|casualty|reinsurance/i.test(industry??'')||combinedCount>0;
 const tangibleReturn=bank||pc;
 const incomes=ys.map(commonIncome),positive=incomes.filter(n=>n!==null&&n>0).length;
 const roes=ys.map(y=>ratio(commonIncome(y),commonBook(y)));
 const returns=ys.map(y=>{
  const capital=tangibleReturn?tangibleCommonBook(y):commonBook(y);
  return capital===null||commonIncome(y)===null?null:capital<=0?0:ratio(commonIncome(y),capital);
 });
 const valid=present(returns),typical=valid.length>=5?median(valid):null;
 const worst=valid.length>=5?[...valid].sort((a,b)=>a-b)[1]:null;
 const average=mean(present(roes));
 const cv=average!==null&&average>0&&present(roes).length>=5?Math.sqrt(mean(present(roes).map(n=>(n-average)**2))!)/average:null;
 const efficiency=ys.map(y=>y.efficiencyRatio??ratio(y.nonInterestExpense??null,y.netRevenue??null));
 const efficiencyMedian=present(efficiency).length>=5?median(present(efficiency)):null;
 const profitable=combined.filter(n=>n!==null&&n<1).length;
 const underwriting=profitable>=7||combinedCount-profitable>3?profitable:null;
 const floatStart=first?.insuranceFloat??null,floatEnd=end?.insuranceFloat??null;
 const floatGrowth=complete?cagr({first:floatStart,last:floatEnd,years:10}):null;
 // Chain annual book + common dividend returns, reinvesting distributions at book.
 const factors=history.slice(1).map((y,i)=>{
  const prev=books[i],current=books[i+1],dividend=perShare(y.commonDividendsPaid??y.dividendsPaid,y);
  return prev===null||prev<=0||current===null||current<=0||dividend===null?null:(current+dividend)/prev;
 });
 const growth=complete&&factors.every(known)?Math.exp(sum((factors as number[]).map(Math.log))/10)-1:null;
 const shareGrowth=complete?cagr({first:first.dilutedShares,last:end!.dilutedShares,years:10}):null;
 // A crisis-year jump is disclosed, not silently erased from the full-window test.
 const recap=history.slice(1).filter((y,i)=>[2008,2009].includes(y.fy)&&(rate(y.dilutedShares,history[i].dilutedShares)??0)>.1);
 const ordinaryFactors=history.slice(1).filter(y=>!recap.includes(y)).map(y=>rate(y.dilutedShares,history[history.indexOf(y)-1].dilutedShares));
 const adjusted=complete&&ordinaryFactors.every(known)&&ordinaryFactors.length?Math.exp(sum((ordinaryFactors as number[]).map(n=>Math.log(1+n)))/ordinaryFactors.length)-1:null;
 // Earnings distributed through repurchases are not retained. Compare the
 // remaining earnings per share with book creation; dilution is tested separately.
 const retained=ys.map(y=>{
  const ni=commonIncome(y),d=y.commonDividendsPaid??y.dividendsPaid;
  return ni===null||d===null?null:perShare(ni-d-(y.buybacks??0),y);
 });
 const retainedTotal=complete&&retained.every(known)?sum(retained as number[]):null;
 // Use per-share book creation; never add issuance proceeds to the gain.
 const bookGain=complete&&known(books[0])&&known(books.at(-1))?books.at(-1)!-books[0]!:null;
 const retainedRatio=ratio(bookGain,retainedTotal);
 const loanGrowth=history.slice(1).map((y,i)=>rate(y.loans,history[i].loans));
 const depositGrowth=history.slice(1).map((y,i)=>rate(y.deposits,history[i].deposits));
 const growthPairs=loanGrowth.flatMap((n,i)=>known(n)&&known(depositGrowth[i])?[{loan:n,deposit:depositGrowth[i]!}]:[]);
 const loanCagr=complete?cagr({first:first.loans??null,last:end?.loans??null,years:10}):null;
 const depositCagr=complete?cagr({first:first.deposits??null,last:end?.deposits??null,years:10}):null;
 const excessive=growthPairs.filter(p=>p.loan>0&&p.loan>2*Math.max(0,p.deposit)).length;
 const peerPairs=ys.flatMap(y=>{
  const provision=ratio(y.creditLossProvision??null,y.loans??null),peer=y.peerCreditLossRate;
  return provision!==null&&known(peer)?[{provision,peer}]:[];
 });
 const excessLosses=peerPairs.filter(p=>p.provision>p.peer).length;
 const reserve=ys.map(y=>ratio(y.adverseReserveDevelopment??null,y.insuranceReserves??null));
 const adverse=present(reserve).filter(n=>n>0).length;
 const restatements=ys.filter(y=>y.restated===true).length;
 const accountingChecks:Check[]=[
  {pass:!end||book(end)===null ? null : book(end)!>0, data:'positive common capital',reason:'nonpositive common capital'},
  {pass:restatements===0,data:'reported restatements',reason:'reported financial restatement'},
  ...(loanCagr!==null&&depositCagr!==null?[{pass:loanCagr<=0||loanCagr<=2*Math.max(0,depositCagr),data:'ten-year loan/deposit growth',reason:'ten-year loan growth exceeded twice deposit growth'}]:[]),
  ...(peerPairs.length>=5?[{pass:excessLosses<Math.ceil(peerPairs.length*.6),data:'peer credit losses',reason:'credit provisions persistently exceed same-year peers'}]:[]),
  ...(present(reserve).length>=5?[{pass:adverse<3,data:'reserve development',reason:'adverse reserve development in at least three years'}]:[]),
 ];
 const missing=['preferred equity','common earnings'].filter((_,i)=>ys.some(y=>i?y.commonNetIncome==null:y.preferredEquity==null));
 const basis=[`${bank?'Tangible common':'Common'} book per share; common amounts fall back to parent totals when unavailable`,...(missing.length?[`Common-capital detail unavailable: ${missing.join(', ')} (parent-total proxy)`]:[])];
 const make=(key:NumericOutcome['key'],metrics:NumericOutcome['metrics'],series:NumericOutcome['series'],checks:Check[],reasons:string[]=[])=>outcome({key,metrics,series,checks,reasons});
 return {
 understandable:make('understandable',{historyYears:ys.length,positiveIncomeYears:positive,requiredPositiveYears:bank?9:8,roeCv:cv},{netIncome:ys.map(y=>[y.fy,commonIncome(y)]),roe:ys.map((y,i)=>[y.fy,roes[i]])},[
  {pass:positive>=(bank?9:8)?true:positive+10-incomes.filter(known).length<(bank?9:8)?false:null,data:'ten years of earnings',reason:`positive earnings in fewer than ${bank?9:8} of ten years`},
 ],['ROE coefficient of variation is informational; returns use fiscal-end equity, not reported average adjusted capital']),
 moat:make('moat',{roeMedian:typical,returnThreshold:tangibleReturn?.12:.10,tangibleReturn:Number(tangibleReturn),roeSecondLowest:worst,efficiencyMedian,combinedProfitableYears:underwriting,combinedReportedYears:combinedCount,floatGrowth},{roe:ys.map((y,i)=>[y.fy,returns[i]]),combinedRatio:ys.map((y,i)=>[y.fy,combined[i]]),efficiencyRatio:ys.map((y,i)=>[y.fy,efficiency[i]])},[
  {pass:!end||book(end)===null?null:book(end)!>0,data:'positive common capital',reason:'nonpositive common capital'},
  ...(pc&&underwriting!==null?[{pass:underwriting>=7,data:'underwriting record',reason:'combined ratio below 100% in fewer than seven years'}]:[{pass:typical===null?null:typical>=(tangibleReturn?.12:.10),data:'median return on common equity',reason:'median return on common equity below threshold'}]),
  ...(bank?[{pass:worst===null?null:worst>=.05,data:'worst return years',reason:'return on tangible common equity below 5% in more than one year'}]:[]),
  ...(bank&&efficiencyMedian!==null?[{pass:efficiencyMedian<=.65,data:'efficiency ratio',reason:'median cost/income ratio exceeds 65%'}]:[]),
  ...(!bank&&floatGrowth!==null?[{pass:floatGrowth>=0,data:'float growth',reason:'insurance float declined over ten years'}]:[]),
 ],[...basis,...(pc&&underwriting===null?['Combined ratio history unavailable; return on tangible common equity is the core fallback']:[])]),
 economics:make('economics',{bookReturnCagr:growth,bookStartPerShare:books[0]??null,bookEndPerShare:books.at(-1)??null},{bookPlusDividendReturn:history.slice(1).map((y,i)=>[y.fy,factors[i]===null?null:factors[i]!-1]),bookPerShare:history.map((y,i)=>[y.fy,books[i]]),dividendsPerShare:ys.map(y=>[y.fy,perShare(y.commonDividendsPaid??y.dividendsPaid,y)])},[
  {pass:books.some(n=>n!==null&&n<=0)?false:growth===null?null:growth>=.07,data:'eleven consecutive book observations and ten dividend observations',reason:books.some(n=>n!==null&&n<=0)?'nonpositive book value in the compounding window':'book value per share plus dividends compounded below 7% annually'},
 ],basis),
 management:make('management',{shareCagr:shareGrowth,shareCagrExCrisis:adjusted,crisisRecapitalizations:recap.length,retainedBookRatio:retainedRatio,retainedBookGain:bookGain,retainedPerShare:retainedTotal},{shares:history.map(y=>[y.fy,y.dilutedShares]),bookPerShare:history.map((y,i)=>[y.fy,books[i]])},[
  {pass:adjusted===null?null:adjusted<=.02+Number.EPSILON,data:'ten-year share growth excluding flagged crisis recapitalisations',reason:'ordinary share count growth exceeds 2% annually'},
  {pass:retainedTotal===null||bookGain===null?null:retainedTotal<=0?bookGain>=0:bookGain+1e-9*Math.max(1,Math.abs(retainedTotal))>=retainedTotal,data:'retained earnings versus book per share',reason:'book per share gain below retained common earnings per share'},
 ],[...basis,...(ys.some(y=>y.buybacks==null)?['Unreported buybacks treated as zero; retained-earnings test is conservative']:[]),...recap.map(y=>`Crisis recapitalisation flagged in FY${y.fy}; full share CAGR remains displayed`)]),
 accounting:make('accounting',{financialRedFlags:accountingChecks.filter(c=>c.pass===false).length,loanCagr,depositCagr,restatementYears:restatements,loanGrowthExcessYears:growthPairs.length?excessive:null,peerLossExcessYears:peerPairs.length?excessLosses:null,adverseReserveYears:present(reserve).length?adverse:null},{loanGrowth:ys.map((y,i)=>[y.fy,loanGrowth[i]??null]),depositGrowth:ys.map((y,i)=>[y.fy,depositGrowth[i]??null]),reserveDevelopment:ys.map((y,i)=>[y.fy,reserve[i]])},accountingChecks,[
  ...(!ys.some(y=>y.restated!==undefined)?['Restatement status not reported; no known restatement is not an audit assurance']:[]),
  ...(peerPairs.length<5?['Peer credit-loss comparison unavailable']:[]),...(loanCagr===null||depositCagr===null?['Loan/deposit growth comparison unavailable']:[]),...(!bank&&present(reserve).length<5?['Reserve development unavailable']:[]),
 ]),
 };
}
