/** Read-only current-verdict screen, including existing LTM confirmation. */
import {readFileSync,readdirSync,writeFileSync,existsSync,statfsSync} from 'node:fs';
import {homedir} from 'node:os';
import {runNumericTests as baseline} from '../../.audit/understandable/baseline/lib/value/tests';
import {runNumericTests as candidate} from '../../.audit/understandable/candidate/lib/value/tests';
import {withZeroDefaults,opMargin,last} from '../../lib/value/metrics';
import {qualityLtmAt,qualityLtmHistoryAt} from '../../lib/value/quality-ltm';
import {cachedQualityQuarters} from '../../lib/value/cached-quality-quarters';
const corpus=homedir()+'/value-corpus',out=new URL('./outputs/',import.meta.url);
const read=(rel:string)=>{const p=corpus+'/'+rel;return existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;};
const changes:any[]=[],errors:any[]=[];let n=0,eligible=0;
const freeze=new Set(read('verdict-freeze.json')?.ids??[]);
for(const file of readdirSync(corpus+'/publish-repo/dossiers').filter(f=>/^\d{3}\.json$/.test(f))){
 for(const a of Object.values(read('publish-repo/dossiers/'+file)) as any[]){
  n++;if(a.company.kind!=='operating')continue;
  const before=a.tests?.understandable;
  // No effect is possible on a low-CV current observation. Scan annual baseline
  // too only when a confirmed LTM result can conceal an eligible annual window.
  eligible++;
  const inputs=read(`analysis/inputs/${a.id}.json`);
  if(!inputs?.memoYears){errors.push({id:a.id,reason:'missing exact persisted memo years or fundamentals'});continue;}
  const years=inputs.memoYears;
  const annual=last(withZeroDefaults(years),10);
  // A provisional period appends one observation. Unless the surviving annual
  // prefix is positive, complete and profitable, no confirmation can use the exception.
  const possible=(ys:any[])=>ys.length>=6&&ys.every((y,i)=>{
   const m=opMargin({...y,operatingIncome:y.marginOperatingIncomeJudgement??y.operatingIncome});
   const prev=i?opMargin({...ys[i-1],operatingIncome:ys[i-1].marginOperatingIncomeJudgement??ys[i-1].operatingIncome}):null;
   return m!==null&&Number.isFinite(m)&&m>0&&y.netIncome!==null&&Number.isFinite(y.netIncome)&&y.netIncome>=0&&(!i||y.fy===ys[i-1].fy+1);
  });
  if(!possible(annual)&&!possible(annual.slice(-9)))continue;
  const f=read(`fundamentals/${a.id}.json`);if(!f){errors.push({id:a.id,reason:'missing fundamentals'});continue;}
  const qs=cachedQualityQuarters(a.id,read),cutoff='2026-10-05';
  const qualityLtm=qualityLtmAt(qs,years,cutoff,f.splits);
  const qualityLtmHistory=qualityLtmHistoryAt(qs,years,cutoff,f.splits,qualityLtm);
  const args={years,qualityLtm,qualityLtmHistory,kind:a.company.kind,industry:a.company.industry};
  const b=baseline(args).understandable,c=candidate(args).understandable;
  if(b.numeric!==c.numeric||c.metrics.opMarginImproving){
   changes.push({id:a.id,name:a.company.name,frozen:freeze.has(a.id),published:before.result,baseline:b.numeric,candidate:c.numeric,baselineMatchesPublished:b.numeric===before.numeric,cvBefore:b.metrics.opMarginCv,cvAfter:c.metrics.opMarginCv,reason:c.reasons,series:c.series,provisional:c.provisional,otherTests:Object.fromEntries(Object.entries(a.tests).filter(([k])=>k!=='understandable').map(([k,t]:any)=>[k,t.result]))});
  }
 }
 console.log('screened',n,'potential changes',changes.length);
 const st=statfsSync(homedir()+'/data');if(st.bavail*st.bsize<4*1024**3)throw Error('DISK STOP: commit and stop');
}
writeFileSync(new URL('current-screen.json',out),JSON.stringify({n,eligible,changes,errors},null,2)+'\n');
console.log(JSON.stringify({n,eligible,changes:changes.map(c=>({id:c.id,frozen:c.frozen,before:c.published,after:c.candidate})),errors:errors.length}));
