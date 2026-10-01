import { completeCachedYears, completeCachedSplits, completeCompanyMetadata } from '../../lib/value/completeness/cached-years';
import {kindFor} from '../../lib/value/universe';
/** Read the shared corpus, evaluate independent copies, write only staging. */
import {readFileSync,existsSync,mkdirSync,writeFileSync,statfsSync} from 'node:fs';
import {join,resolve,basename} from 'node:path';
import {homedir} from 'node:os';
import {fillYears} from '../../lib/value/completeness/second-sources';
import {normalizeEodhd} from '../../lib/value/normalize-eodhd';
import {deriveYears} from '../../lib/value/derive';
import {annualFiscalYear} from '../../lib/value/fiscal-period';
import {checkIntegrity} from '../../lib/value/integrity';
import {runNumericTests} from '../../lib/value/tests';
import type {Analysis,Fundamentals,Year} from '../../lib/value/types';
const root=join(homedir(),'value-corpus'),out=join(root,'staging/release-8/complete-2');
const read=<T,>(p:string):T|null=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
const disk=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<5*1024**3)throw Error('Disk below 5 GiB: stopped');};
disk();mkdirSync(join(out,'fundamentals'),{recursive:true});
const baseline=read<Array<{id:string;indexes:string[]}>>(process.argv[2]??join(out,'baseline.json'))!;
const rows=[];
const cachedRead=<T,>(p:string):T|null=>read<T>(join(out,p))??read<T>(join(root,p));
for(const b of baseline){
 disk();const a=read<Analysis>(join(root,`analysis/${b.id}.json`))!;
 const f=read<Fundamentals>(join(root,`fundamentals/${b.id}.json`))!;
 const raw=read<any>(join(root,`raw/eodhd/${b.id}.json`));
 let years=f.years;
 if(raw)years=fillYears(years,normalizeEodhd(raw,b.id).fundamentals.years);
 const ciks=new Set([a.company.cik,...years.flatMap(y=>Object.values(y.provenance??{}).map(p=>/CIK(\d+)/.exec(p.source)?.[1]))].filter(Boolean).map(s=>String(Number(s))));
 for(const cik of ciks){
  const cache=read<Year[]>(join(root,`completeness/sec/${cik}.json`));
  if(cache)years=fillYears(years.map(y=>({...y,fy:annualFiscalYear(y.end)})),cache.map(y=>({...y,fy:annualFiscalYear(y.end)})));
 }
 for(const source of ['yahoo','edinet']){
  const cache=read<Year[]>(join(root,`completeness/${source}/${b.id}.json`));
  if(cache)years=fillYears(years,cache);
 }
 const supplements=read<Year[]>(join(out,`supplements/${b.id}.json`));
 if(supplements)years=fillYears(years,supplements);
 a.company=completeCompanyMetadata(a.company,cachedRead);
 f.splits=completeCachedSplits(a.company.id,f.splits,cachedRead);
 f.years=completeCachedYears(a.company,years,cachedRead);
 const prices=read<any>(join(root,`prices-history/${b.id}.json`));
 f.integrity=checkIntegrity(f,{source:a.company.source,priceHistory:Array.isArray(prices)?prices:prices?.prices});
 a.company.kind=kindFor({...a.company,lending:f.years.at(-1)});
 const numeric=runNumericTests({years:f.years,kind:a.company.kind,industry:a.company.industry});
 const reasons=!f.integrity.ok?f.integrity.reasons:Object.entries(numeric).filter(([,t])=>t.numeric==='unclear').flatMap(([k,t])=>t.reasons.filter(r=>r.startsWith('not enough')).map(r=>`${k}: ${r}`));
 const row={id:b.id,indexes:b.indexes,years:f.years.length,kind:a.company.kind,investmentHolding:a.company.investmentHolding,reasons,tests:Object.fromEntries(Object.entries(numeric).map(([k,t])=>[k,t.numeric]))};
 rows.push(row);writeFileSync(join(out,`fundamentals/${b.id}.json`),JSON.stringify(f));
}
const auditName=process.argv[2] ? basename(process.argv[2])==='all-index-members.json'?'numeric-audit-all.json':'numeric-audit-focused.json':'numeric-audit.json';
writeFileSync(join(out,auditName),JSON.stringify(rows,null,2));
const counts:Record<string,number>={};for(const r of rows)for(const reason of r.reasons)counts[reason]=(counts[reason]??0)+1;
console.log(JSON.stringify({companies:rows.length,numericDecided:rows.filter(r=>!r.reasons.length).length,reasons:Object.entries(counts).sort((a,b)=>b[1]-a[1])},null,2));
