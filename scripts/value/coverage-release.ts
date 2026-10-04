/** Private controller-reviewed release scope, consumed by the ordinary nightly publisher. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {corpusPath,readCorpusJson} from '../../lib/value/corpus';
import {validCompanyId} from '../../lib/value/companies';
import type {Analysis,PriceMap,ReportMeta} from '../../lib/value/types';
import {freshPrice} from './stages/prices';

export interface CoverageRelease {
 version:1;
 baselineIds:string[];
 baselineAnalysisHashes:Record<string,string|null>;
 additionIds:string[];
 held:Array<{id:string;reasons:string[]}>;
}
export function readCoverageRelease():CoverageRelease|null {
 const r=readCorpusJson<CoverageRelease>('held-membership/release.json');
 if(!r)return null;
 const ids=[...(r.baselineIds??[]),...(r.additionIds??[]),...(r.held??[]).map(x=>x.id)];
 if(r.version!==1||!Array.isArray(r.baselineIds)||!Array.isArray(r.additionIds)||!Array.isArray(r.held)
   ||ids.some(id=>!validCompanyId(id,'coverage release'))||new Set(ids).size!==ids.length
   ||!r.baselineAnalysisHashes||r.baselineIds.some(id=>!(id in r.baselineAnalysisHashes)||r.baselineAnalysisHashes[id]!==null&&!/^[a-f0-9]{64}$/.test(r.baselineAnalysisHashes[id]!))
   ||r.held.some(x=>!Array.isArray(x.reasons)||!x.reasons.length||x.reasons.some(reason=>typeof reason!=='string')))
   throw Error('Invalid coverage release manifest');
 return r;
}
export function additionInputProblems(id:string,quote:PriceMap[string]|undefined,now=Date.now()):string[]{
 const reasons:string[]=[];
 const fundamentals=readCorpusJson<{years:unknown[]}>(`fundamentals/${id}.json`);
 if(!fundamentals?.years?.length)reasons.push('fundamentals');
 const report=readCorpusJson<ReportMeta>(`reports/${id}/meta.json`);
 const a=readCorpusJson<Analysis>(`analysis/${id}.json`);
 const inputs=readCorpusJson<{asOf:string;sections?:Record<string,string>}>(`analysis/inputs/${id}.json`);
 if(!report||report.kind==='description'||!report.sections.length||!a?.report||a.report.kind==='description'
   ||!inputs?.sections||!report.sections.some(key=>inputs.sections?.[key]?.trim()))reasons.push('full-filing');
 if(!quote||quote[2]==='seed'||!freshPrice(quote,now))reasons.push('current-price');
 const cached=readCorpusJson<Array<[string,number]>|{prices:Array<[string,number]>}>(`prices-history/${id}.json`);
 const history=Array.isArray(cached)?cached:cached?.prices;
 if(!history?.some(row=>/^\d{4}-\d{2}$/.test(row[0])&&Number.isFinite(row[1])&&row[1]>0))reasons.push('price-history');
 if(!a||!inputs||a.asOf!==inputs.asOf||!a.ownerMemo?.inputHash)reasons.push('analysis-input-binding');
 return reasons;
}
/** Publication may add series, but may never replace the analyzed numeric values. */
export function assertAdditionBinding(a:Analysis,d:Analysis|undefined):void {
 const fail=()=>{throw Error(`Coverage analysis-to-publication binding failed: ${a.id}`);};
 if(!d||a.id!==d.id||a.asOf!==d.asOf||!isDeepStrictEqual(a.versions,d.versions)
   ||a.reportingCurrency!==d.reportingCurrency||!a.ownerMemo?.inputHash||a.ownerMemo.inputHash!==d.ownerMemo?.inputHash)fail();
 for(const [key,rows]of Object.entries(a.series??{}))if(!isDeepStrictEqual(rows,d!.series?.[key]))fail();
 for(const [key,test]of Object.entries(a.tests))for(const [series,rows]of Object.entries(test.series??{})){
  const exposed=(d!.tests as typeof a.tests)[key as keyof typeof a.tests]?.series?.[series];
  // Public tests intentionally omit irrelevant charts; every exposed value is bound.
  if(exposed!==undefined&&!isDeepStrictEqual(rows,exposed))fail();
 }
}

export function baselineAnalysisHash(id:string):string|null{
 try{return createHash('sha256').update(readFileSync(corpusPath(`analysis/${id}.json`))).digest('hex');}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
}
/** Re-rendering old research must not change a released baseline. A new analysis
 * is an explicit refresh and resumes normal publishing, except verdict freezes. */
export function unchangedCoverageBaselineIds():string[]{
 const release=readCoverageRelease();
 return release?.baselineIds.filter(id=>baselineAnalysisHash(id)===release.baselineAnalysisHashes[id])??[];
}
