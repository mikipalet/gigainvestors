import {impliedAverageGrowth,numericMemo} from '../owner-memo';
import type {Dossier,PriceMap,Series} from '../types';
import type {MemoLine} from '../owner-memo';
import type {Candidate} from './selection';
export interface StoryFact {text:string;url:string;date:string;points:Series;label:string;unit:'percent'|'money'}
export interface PriceStory {version:1;asOf:string;line:string;selected?:Candidate;events:Candidate[];needs:string|null;facts:StoryFact[];priceDate:string|null}
const words=(s:string)=>s.trim().split(/\s+/).length;
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
export const monthLabel=(s:string)=>new Date(s.slice(0,7)+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
export const sourceQuote=(c:Candidate)=>`"${c.text}" (${c.source}, ${monthLabel(c.date)})`;
export function filingFacts(d:Dossier):StoryFact[]{
 const out:StoryFact[]=[],date=d.report.filed??d.asOf.slice(0,10),url=d.report.url??'https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds/';
 const revenue=(d.series?.revenue??[]).filter((p):p is [number,number]=>finite(p[1]));
 const last=revenue.at(-1),previous=last?revenue.find(p=>p[0]===last[0]-1):undefined;
 if(last&&previous&&previous[1]>0){const change=Number(((last[1]/previous[1]-1)*100).toFixed(1));out.push({text:`sales ${change>=0?'+':''}${change}%`,url,date,points:revenue,label:`Sales · FY${previous[0]}–${last[0]}`,unit:'money'});}
 if(!out.length){
  const profits=(d.series?.netIncome??d.tests?.understandable?.series?.netIncome??[]).filter((p):p is [number,number]=>finite(p[1]));
  const last=profits.at(-1),previous=last?profits.find(p=>p[0]===last[0]-1):undefined;
  if(last){const change=previous&&previous[1]>0?Number(((last[1]/previous[1]-1)*100).toFixed(1)):null;
   out.push({text:change!==null?`net income ${change>=0?'+':''}${change}%`:`net income ${d.reportingCurrency??d.company.currency} ${new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(last[1])}`,url,date,points:profits,label:`Net income · FY${last[0]}`,unit:'money'});
  }
 }
 const margins=(d.tests?.moat?.series?.grossMargin??[]).filter((p):p is [number,number]=>finite(p[1])&&p[1]>0&&p[1]<1),m=margins.at(-1);
 if(m&&d.company.kind==='operating')out.push({text:`gross margin ${Number((m[1]*100).toFixed(1))}%`,url,date,points:margins,label:`Gross margin · FY${m[0]}`,unit:'percent'});
 return out;
}
export function priceNeeds(d:Dossier,quote:PriceMap[string]|null):string|null {
 const v=d.valuation;if(!v||!quote)return null;
 if(v.method!=='owner_earnings')return numericMemo(d,[],quote[0]).find(l=>l.question===7)?.answer.replace(/\.$/,'')??null;
 const fx=v.perShareTrading?.currency===d.company.currency?v.perShareTrading.fxRate:v.currency===d.company.currency?1:null;
 if(!fx||!finite(fx))return null;
 const growth=impliedAverageGrowth(v,quote[0]/fx);
 return growth!==null&&finite(growth)?`Price needs cash profits to ${growth<0?'shrink':'grow'} ${Number((Math.abs(growth)*100).toFixed(1))}% a year for ten years`:null;
}
export function composePriceStory(d:Dossier,quote:PriceMap[string]|null,selected:Candidate|null,events:Candidate[],now:string):PriceStory {
 const history=(d.priceHistory??[]).filter(([date,value])=>date>=String(Number(now.slice(0,4))-5)+now.slice(4,7)&&finite(value)&&value>0&&date<=(quote?.[1]??now)).sort((a,b)=>a[0].localeCompare(b[0]));
 const latest:readonly [number,string]|null=quote?.[2]!=='seed'&&quote?[quote[0],quote[1]]:history.at(-1)?[history.at(-1)![1],history.at(-1)![0]]:null;
 const peak=latest?history.filter(p=>p[0]<latest[1]).reduce<(typeof history)[number]|null>((best,p)=>!best||p[1]>best[1]?p:best,null):null;
 const start=history.find(p=>p[0]>=String(Number(now.slice(0,4))-3)+now.slice(4,7))??history[0];
 const reference=peak&&latest&&latest[0]<peak[1]*.8?peak:start;
 const change=latest&&reference?latest[0]/reference[1]-1:null;
 const needs=priceNeeds(d,quote),facts=filingFacts(d);
 const move=change!==null&&reference?`${change<0?'Down':'Up'} ${Math.round(Math.abs(change)*100)}% since ${monthLabel(reference[0])}`:latest?`Price ${d.company.currency} ${Number(latest[0].toFixed(2))}`:'';
 const main=needs&&change!==null&&change>=0?needs:move||needs||'';
 // Publication checks research freshness separately; source dates retain the 18-month candidate window.
 const sourceCutoff=new Date(now);sourceCutoff.setUTCMonth(sourceCutoff.getUTCMonth()-18);
 const fresh=selected&&selected.date<=now&&selected.date>=sourceCutoff.toISOString().slice(0,10);
 const candidate=fresh&&words(selected.text)<=14?selected:null;
 const fact=facts[0]?.text??'';
 let line=[main,candidate?sourceQuote(candidate):'',fact].filter(Boolean).join(' · ');
 // Omit an entire quote if it cannot fit; never shorten or paraphrase source words.
 const retained=candidate&&words(line)<=30?candidate:null;
 if(!retained)line=[main,fact].filter(Boolean).join(' · ');
 return {version:1,asOf:now,line,selected:retained??undefined,events:events.filter(c=>words(c.text)<=14).slice(0,6).sort((a,b)=>a.date.localeCompare(b.date)),needs,facts,priceDate:latest?.[1]??null};
}
export function pricingFallback(d:Dossier):MemoLine|null {
 if(d.company.kind!=='operating'||d.company.investmentHolding)return null;
 const points=(d.tests?.moat?.series?.grossMargin??[]).filter((p):p is [number,number]=>[2021,2022,2023].includes(p[0])&&finite(p[1])&&p[1]>0&&p[1]<1);
 if(points.length!==3||new Set(points.map(p=>p[0])).size!==3||Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))>.0200000001)return null;
 const margin=Math.round(points.find(p=>p[0]===2022)![1]*100);
 return {question:3,answer:`Kept about a ${margin}% gross margin through 2022 cost inflation.`,basis:'computed',evidence:[{quote:`Gross margin observations: ${JSON.stringify(points)}; range within 2 percentage points.`,url:d.report.url??'https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds/',filed:d.report.filed??d.asOf,section:'Computed gross margins, 2021–23'}],chart:{label:'Gross margin',unit:'percent',points}};
}
export function selectedMemo(c:Candidate,direction?:string):MemoLine|null {
 const answer=sourceQuote(c);
 if(words(answer)>18)return null;
 return {question:c.kind==='pricing'?3:6,answer,literal:{text:c.text,source:c.source,date:c.date},basis:'filing',evidence:[{quote:c.text,url:c.url,filed:c.date,section:`${c.source} · ${c.section}`}],tone:direction==='no'?'red':undefined};
}
export function refreshQueue(ids:string[],checked:Record<string,string>,weeklyMovers:Set<string>,now:string,limit=400):string[]{
 const rotation=[...ids].filter(id=>!checked[id]||Date.parse(now)-Date.parse(checked[id])>=6*86400000).sort((a,b)=>(checked[a]??'').localeCompare(checked[b]??'')||a.localeCompare(b,undefined,{numeric:true})).slice(0,limit);
 return [...new Set([...rotation,...ids.filter(id=>weeklyMovers.has(id)&&checked[id]?.slice(0,10)!==now.slice(0,10))])];
}
