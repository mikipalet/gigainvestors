import { readFileSync,readdirSync,writeFileSync,existsSync } from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeEodhd,refreshEodhdBalance} from '../../lib/value/normalize-eodhd';
import {fillYears} from '../../lib/value/completeness/second-sources';
import {deriveYears} from '../../lib/value/derive';
import {supplementFinancialFacts} from '../../lib/value/financial-facts';
import {ownerReturn} from '../../lib/value/owner-return';
import {bestWesternListing} from '../../lib/value/western';
import {corpusDir} from '../../lib/value/corpus';
import {last,median,roic,returnOnTotalCapital} from '../../lib/value/metrics';
import {ownerEarningsBridge} from '../../lib/value/owner-earnings';
import path from 'node:path';
const root=corpusDir(),out=path.resolve(process.argv[2]??path.join(root,'staging/release-8'));
if(!existsSync(path.join(out,'meta.json')))throw Error('Supply an existing local publication directory');
const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
const quotes=Object.assign({},...readdirSync(out+'/prices').map(f=>read(out+'/prices/'+f)));
const indexes=readdirSync(out+'/index').filter(f=>f!=='default.json').flatMap(f=>read(out+'/index/'+f));
const dossiers=Object.assign({},...readdirSync(out+'/dossiers').map(f=>read(out+'/dossiers/'+f)));
const members=read(root+'/index-membership/latest.json');
const rows=indexes.filter(r=>r.b).map(row=>{
 const id=row.id,a=read(root+'/analysis/'+id+'.json'),d=dossiers[id],f=read(root+'/fundamentals/'+id+'.json'),raw=read(root+'/raw/eodhd/'+id+'.json');
 const normalized=raw?normalizeEodhd(raw,id).fundamentals:null;
 let years=deriveYears(normalized?fillYears(f.years,normalized.years):f.years);
 if(raw)years=years.map(y=>refreshEodhdBalance(y,normalized?.years.find(n=>n.end===y.end),raw,a.company.country));
 const sector=read(root+'/raw/sec-companyfacts/'+id+'.json');if(sector)years=supplementFinancialFacts(years,sector);
 const latest=years.at(-1)!,v=d.valuation,quote=quotes[id],quality=a.tests.moat.metrics;
 const flags=[...(a.dataQualityFlags??[]),...(v.riskFlags??[]),...(a.valuation?.bondFlags??[])];
 if(quote?.[2])flags.push('quote: '+quote[2]);
 if(a.company.kind!=='operating')flags.push('Financial company: net debt is reported balance-sheet debt less cash; deposits are operating funding, not an equity-value deduction');
 const provenance=Object.fromEntries(['revenue','netIncome','dilutedShares','totalDebt','cash'].map(field=>[field,latest.provenance?.[field]??null]));
 for(const [field,p] of Object.entries(provenance))if(!p)flags.push(field+': no field-level provenance');
 const secondary=Object.entries(provenance).filter(([,p]:any)=>p&&p.method!=='reported');
 for(const [field,p] of secondary as any)flags.push(field+': '+p.method);
 return {id,name:d.company.nameEn??d.company.name,indexes:d.company.indexes,western:Boolean(bestWesternListing(d.company)),westernListing:bestWesternListing(d.company),
  price:{value:quote[0],date:quote[1],currency:d.company.currency,basis:quote[2]??'close'},
  value:{low:row.v[0],mid:row.v[1],high:row.v[2],currency:row.cur},buyPrice:row.v[1]*(1-row.m),expectedReturn:ownerReturn(v,d.company.currency,d.company.marketCapUsd,quote[0])?.expected??null,
  tier:v.method==='nav'?'nav':d.company.kind!=='operating'?'financial':v.tier??'standard',
  capitalReturns:d.company.kind==='operating'&&!d.company.investmentHolding?{
   excludingGoodwill:median(last(years,10).map(roic).filter((n):n is number=>n!==null&&Number.isFinite(n))),
   includingAcquisitions:median(ownerEarningsBridge(years).filter(r=>r.year.fy>latest.fy-10).map(r=>returnOnTotalCapital(r.year,r.value)).filter((n):n is number=>n!==null&&Number.isFinite(n))),
   basis:'owner_earnings',
  }:null,quality10y:{metric:d.company.kind==='operating'?'ROIC':quality.tangibleReturn===0?'ROE':'ROTE',median:d.company.kind==='operating'?quality.roicMedian:quality.roeMedian,series:a.tests.moat.series[d.company.kind==='operating'?'roic':'roe']?.slice(-10)},
  latestFY:{fy:latest.fy,end:latest.end,currency:latest.currency??f.currency,revenue:latest.revenue,netIncome:latest.netIncome,shares:latest.dilutedShares,netDebt:latest.totalDebt!=null&&latest.cash!=null?latest.totalDebt-latest.cash:null,totalDebt:latest.totalDebt,cash:latest.cash},
  valuationShares:v.shares,valuationNetDebt:v.netDebt??null,provenance,provenanceFlags:[...new Set(flags)],sourceAssumptions:a.valuation?.assumptions??[],
  shareCheck:read(root+'/enrichment-v7/share-checks/'+id+'.json'),analysisSha256:createHash('sha256').update(readFileSync(root+'/analysis/'+id+'.json')).digest('hex')};
}).sort((a,b)=>Number(b.western)-Number(a.western)||a.id.localeCompare(b.id));
if(rows.some(r=>!r.indexes?.length))throw Error('Nonmember buy');
writeFileSync(out+'/buy-audit.json',JSON.stringify({asOf:new Date().toISOString(),source:'release-8 published index and dossiers; matching corpus annual inputs',membershipAsOf:members.asOf??members.date,counts:{all:rows.length,western:rows.filter(r=>r.western).length},rows},null,2)+'\n');
console.log(JSON.stringify({all:rows.length,western:rows.filter(r=>r.western).length,ids:rows.map(r=>r.id)}));
