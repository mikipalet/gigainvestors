import {emptyYear} from './second-sources';
import {deriveYears} from '../derive';
import {htmlToText} from '../reports/html-to-text';
import type {Year} from '../types';
export type Schedules=Record<string,Record<string,Record<string,string>>>;
const number=(s:string|undefined):number|null=>{if(s==null||!s.trim())return null;const v=s.trim().replaceAll(',','').replaceAll('%','');if(v==='—'||v==='-')return 0;return /^-?\d+(?:\.\d+)?$/.test(v)?Number(v):null;};
export function screenerIndustry(html:string):string|null{
 const section=html.slice(html.indexOf('Peer comparison')).split('Part of')[0];
 return [...section.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map(m=>htmlToText(m[1]).trim()).filter(Boolean).at(-1)??null;
}
const clean=(s:string)=>htmlToText(s).replace(/\s+/g,' ').replace(/\s*\+$/,'').trim();
/** Public consolidated annual tables and their expanded schedules, in crore INR.
 * Cash-flow purchases are separate from investment purchases and acquisitions. */
export function yearsFromScreener(html:string,schedules:Schedules,source:string):Year[]{
 if(!/Figures in Rs\. Crores/.test(htmlToText(html)))throw Error('Expected INR crore statement units');
 const tables:Record<string,Record<string,Record<string,string>>>={};
 for(const section of ['profit-loss','balance-sheet','cash-flow']){
  const body=new RegExp(`<section\\b[^>]*id=["']${section}["'][^>]*>([\\s\\S]*?)</section>`).exec(html)?.[1];
  const table=body&&/<table\b[^>]*>([\s\S]*?)<\/table>/.exec(body)?.[1];if(!table)continue;
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map(m=>clean(m[1])));
  const header=rows.shift()??[];tables[section]={};
  for(const row of rows)tables[section][row[0]]=Object.fromEntries(row.slice(1).map((v,i)=>[header[i+1],v]));
 }
 const periods=[...new Set(Object.values(tables['profit-loss']??{}).flatMap(row=>Object.keys(row)))].filter(p=>/^(?:Mar|Jun|Sep|Dec) \d{4}$/.test(p));
 return deriveYears(periods.map(period=>{
  const [month,year]=period.split(' '),end=`${year}-${({Mar:'03-31',Jun:'06-30',Sep:'09-30',Dec:'12-31'} as Record<string,string>)[month]}`;
  const y=emptyYear(end,'INR');y.provenance={};
  const get=(section:string,label:string)=>number(tables[section]?.[label]?.[period]);
  const sch=(parent:string,label:string)=>number(schedules[parent]?.[label]?.[period]);
  const put=(field:keyof Year,value:number|null,label:string,scale=1e7,derived=false)=>{
   if(value===null)return;Object.assign(y,{[field]:value*scale});y.provenance![field]={source,field:label,method:derived?'derived':'reported',inputs:[`${period}: ${value}${scale===1e7?' crore INR':''}`]};
  };
  const ni=get('profit-loss','Net Profit'),epsProfit=sch('Net Profit','Profit for EPS');
  put('revenue',get('profit-loss','Sales')??get('profit-loss','Revenue'),'Sales / Revenue');
  const operating=get('profit-loss','Operating Profit'),da=get('profit-loss','Depreciation');
  put('operatingIncome',operating!==null&&da!==null?operating-da:null,'Operating Profit less Depreciation (EBIT)',1e7,true);
  put('preTaxIncome',get('profit-loss','Profit before tax'),'Profit before tax');
  put('interestExpense',get('profit-loss','Interest'),'Interest');put('da',da,'Depreciation');
  put('netIncome',epsProfit??ni,'Profit for EPS / Net Profit');put('totalNetIncome',ni,'Net Profit');
  put('basicEps',get('profit-loss','EPS in Rs'),'EPS in Rs',1);
  const tax=get('profit-loss','Tax %'),pretax=get('profit-loss','Profit before tax');
  put('taxExpense',tax!==null&&pretax!==null?pretax*tax/100:null,'Profit before tax × Tax %',1e7,true);
  const cap=get('balance-sheet','Equity Capital'),reserves=get('balance-sheet','Reserves');
  put('equity',cap!==null&&reserves!==null?cap+reserves:null,'Equity Capital + Reserves',1e7,true);
  put('totalAssets',get('balance-sheet','Total Assets'),'Total Assets');put('totalDebt',get('balance-sheet','Borrowings'),'Borrowings');
  put('ppe',get('balance-sheet','Fixed Assets'),'Fixed Assets');
  put('cash',sch('Other Assets','Cash Equivalents'),'Other Assets / Cash Equivalents');
  put('loans',sch('Other Assets','Loans n Advances'),'Other Assets / Loans n Advances');
  put('receivables',sch('Other Assets','Trade receivables'),'Other Assets / Trade receivables');
  put('inventory',sch('Other Assets','Inventories'),'Other Assets / Inventories');
  put('payables',sch('Other Liabilities','Trade Payables'),'Other Liabilities / Trade Payables');
  put('ocf',get('cash-flow','Cash from Operating Activity'),'Cash from Operating Activity');
  const capex=sch('Cash from Investing Activity','Fixed assets purchased');put('capex',capex===null?null:Math.abs(capex),'Cash from Investing Activity / Fixed assets purchased');
  for(const [field,label] of [['dividendsPaid','Dividends paid'],['buybacks','Shares bought back']] as const){
   const value=sch('Cash from Financing Activity',label);put(field,value===null?null:Math.abs(value),`Cash from Financing Activity / ${label}`);
  }
  // Parent equity and total assets establish total liabilities only when both exist.
  if(y.totalAssets!==null&&y.equity!==null)put('totalLiabilities',(y.totalAssets-y.equity)/1e7,'Total Assets - Equity Capital - Reserves',1e7,true);
  return y;
 }).sort((a,b)=>a.end.localeCompare(b.end)));
}
