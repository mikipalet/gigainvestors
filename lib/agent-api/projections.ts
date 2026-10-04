import type { Dossier, TestOutcome, Series, PriceMap } from '@/lib/value/types';
import type { InvestorData } from '@/lib/types';
import { QUALITY_TESTS } from '@/lib/value/types';
import { comparableValuation } from '@/lib/value/site-valuation';
import { humanVerdict } from '@/lib/value/judgement/apply';
import { ownerReturn } from '@/lib/value/owner-return';
import { priceState,priceValue } from '@/lib/value/presentation';
import type { Evidence } from '@/lib/value/judgement/types';
/** Explicit computed-only allowlist. New upstream fields are excluded by default. */
export const COMPUTED_SERIES=new Set(['roic','totalRoic','roe','commonRoe','grossMargin','operatingMargin','ownerEarnings','ownerEarningsPerShare','revenuePerShare','bookValuePerShare','perShareValue','nwcToRevenue','ocfToNi','accruals','sbcToOcf','bookPlusDividendReturn','bookPerShare','loanGrowth','depositGrowth']);
export function derivedSeries(series:Record<string,Series>={}) {return Object.fromEntries(Object.entries(series).filter(([key])=>COMPUTED_SERIES.has(key)));}
// Citation metadata retains provenance without distributing extracted vendor tables/quotes.
const source=(e:Evidence)=>({url:e.url,date:e.filed,section:e.section});
function testProjection(t:TestOutcome) {
 return {id:t.key,result:t.result,...(t.provisional?{provisional:t.provisional}:{}),numeric:t.numeric,reasons:t.reasons,metrics:t.metrics,series:derivedSeries(t.series),judgement:t.judgement?{result:t.judgement.result,reason:t.judgement.reason,override:t.judgement.override,source:t.judgement.evidence?source(t.judgement.evidence):null}:null};
}
export function projectDossier(d:Dossier,quote:PriceMap[string]|null) {
 const v=d.valuation,comparable=comparableValuation(v,d.company.currency),ratio=priceValue({price:quote?.[0]??null,mid:comparable?.perShare.mid??null});
 const owner=ownerReturn(v,d.company.currency,d.company.marketCapUsd,quote?.[0]??null);
 const price=priceState({price:quote?.[0]??null,mid:comparable?.perShare.mid??null,b:d.b});
 const short=d.status==='insufficient_data'||!!d.historyCoverage&&d.historyCoverage.years<7;
 const verdict={id:d.id,asOf:d.asOf,verdict:short?'Not enough history yet':humanVerdict(d,Boolean(d.b),Boolean(comparable&&quote),ratio),buyNow:!short&&!d.thesis?.changed&&Boolean(d.b),qualityPasses:QUALITY_TESTS.filter(k=>d.tests[k]?.result==='pass').length,tests:QUALITY_TESTS.map(k=>({id:k,result:d.tests[k]!.result})),priceCheck:{state:price.state,priceToValue:ratio,buyBelow:comparable?comparable.perShare.mid*(1-(d.requiredMos??.25)):null,requiredDiscount:d.requiredMos??.25,expectedReturn:owner?.expected??null,requiredReturn:v?.discountRate??null,currency:d.company.currency,asOf:quote?.[1]??null}};
 const memo=d.ownerMemo?{asOf:d.ownerMemo.asOf,lines:d.ownerMemo.lines.map(l=>({question:l.question,answer:l.answer,basis:l.basis,sources:l.evidence.map(source),chart:l.chart&&l.chart.unit!=='money'?l.chart:null,...(l.capitalAllocation?{capitalAllocation:l.capitalAllocation.map(y=>({fy:y.fy,reinvestmentRate:y.reinvestmentRate??null,incrementalReturn:y.incrementalReturn??null,repurchasePremium:y.repurchase?.premium??null}))}:{})}))}:null;
 const story=d.priceStory;
 const event=(e:NonNullable<typeof story>['events'][number])=>({id:e.id,text:e.text,source:e.source,date:e.date,url:e.url});
 const priceStory=story?{asOf:story.asOf,line:story.line,needs:story.needs,priceDate:story.priceDate,events:story.events.map(event),selected:story.selected?event(story.selected):null,facts:story.facts.map(f=>({text:f.text,url:f.url,date:f.date,label:f.label,unit:f.unit,points:f.unit==='percent'?f.points:[]}))}:null;
 return {...verdict,company:{id:d.id,name:d.company.nameEn??d.company.name,country:d.company.country,currency:d.company.currency,exchange:d.company.exchange,sector:d.company.sector,kind:d.company.kind,westernListing:d.w??null},methodVersion:d.methodVersion??null,tests:QUALITY_TESTS.map(k=>testProjection(d.tests[k]!)),valuation:v?{method:v.method,currency:v.currency,perShare:v.perShare,trading:comparable?{currency:d.company.currency,perShare:comparable.perShare}:null,growth:v.growth,discountRate:v.discountRate,terminalGrowth:v.terminalGrowth,assumptions:v.assumptions,bridge:v.bridge}:null,valuationReason:d.valuationReason,series:derivedSeries(d.series),valueHistory:d.valueHistory??[],memo,priceStory,thesis:d.thesis?{changed:d.thesis.changed,reason:d.thesis.reason,sources:d.thesis.evidence.map(source)}:null,business:d.businessDepth?{asOf:d.businessDepth.asOf,flags:d.businessDepth.flags.map(f=>({id:f.id,label:f.label,why:f.why,tone:f.tone,theme:f.theme,sources:f.evidence.map(source),series:f.unit!=='money'&&f.basis==='computed'?f.series:[],unit:f.unit})),relationships:d.businessDepth.relationships.map(r=>({id:r.id,from:r.from,to:r.to,type:r.type,name:r.name,status:r.status,sources:r.evidence.map(source)}))}:null,holders:d.holders.map(h=>({id:h.code,name:h.name})),source:{url:d.report.url,date:d.report.filed,period:d.report.period}};
}
export function projectHoldings(investor:InvestorData,quarter:string) {
 investor={...investor,quarters:investor.quarters.map(q=>({...q,q:q.q.replace(/\s/g,'')}))};
 quarter=quarter.replace(/\s/g,'');
 const selected=investor.quarters.find(q=>q.q===quarter);if(!selected)throw Error('Quarter not found');
 const sorted=[...investor.quarters].sort((a,b)=>a.q.localeCompare(b.q)),previous=sorted[sorted.findIndex(q=>q.q===quarter)-1];
 const total=selected.positions.reduce((sum,p)=>sum+Math.max(0,p.value),0),priorTotal=previous?.positions.reduce((s,p)=>s+Math.max(0,p.value),0)??0;
 const positions=[...selected.positions].filter(p=>p.value>0).sort((a,b)=>b.value-a.value||a.ticker.localeCompare(b.ticker)).map((p,i)=>{
  const prior=previous?.positions.find(x=>x.ticker===p.ticker),weight=total?p.value/total:0,priorWeight=prior&&priorTotal?prior.value/priorTotal:0;
  return {id:p.ticker,companyId:p.ticker.includes('.')?null:p.ticker+'.US',name:p.name,rank:i+1,weight,weightChange:previous?weight-priorWeight:null,change:!previous?'unknown':!prior?'new':p.shares>prior.shares?'increased':p.shares<prior.shares?'reduced':'unchanged'};
 });
 return {id:investor.code,name:investor.person,firm:investor.firm,quarter,previousQuarter:previous?.q??null,positionCount:positions.length,positions,exited:previous?.positions.filter(p=>!selected.positions.some(n=>n.ticker===p.ticker)).map(p=>p.ticker)??[],concentration:{topFiveWeight:positions.slice(0,5).reduce((s,p)=>s+p.weight,0),herfindahl:positions.reduce((s,p)=>s+p.weight*p.weight,0)},basis:'Weights and changes computed from the reported long portfolio. 13F excludes shorts and many non-US assets; filings lag holdings.'};
}
