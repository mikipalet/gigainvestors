import { shortHistory } from './publication-eligibility';
import type { Analysis, TestOutcome } from './types';

// Operational evidence and unresolved supporting measures stay in the private corpus.
export const privateWording = /verif(?:y|ied|ication)|\bchecking\b|being checked|share sources disagree|share count (?:not )?corrected/i;
export const gapWording = /not enough (?:evidence|data)|not reported|unavailable|\bunclear\b|not tested|cannot judge|evidence incomplete/i;
const publicText=(s:string)=>!privateWording.test(s)&&!gapWording.test(s);
export function publicAnalysis<T extends Analysis>(analysis:T):T {
 const {dataQualityFlags,...rest}=analysis;
 const short=shortHistory(analysis),hideValue=short||Boolean(dataQualityFlags?.length);
 const tests=Object.fromEntries(Object.entries(analysis.tests).flatMap(([key,test]):Array<[string,TestOutcome]>=>{
  if(key==='price'&&(hideValue||test.result==='unclear'))return [];
  if(short)return [[key,{key:test.key,result:'na',numeric:'na',metrics:{},series:{},reasons:[],jev:[]}]];
  return [[key,{...test,metrics:Object.fromEntries(Object.entries(test.metrics).filter(([,v])=>v!==null&&Number.isFinite(v))),
   series:Object.fromEntries(Object.entries(test.series).filter(([,s])=>s.some(([,v])=>v!==null&&Number.isFinite(v)))),
   reasons:test.reasons.filter(publicText),jev:test.jev.filter(a=>a.value!==null&&a.probability!==null&&publicText(a.label)).map(a=>({...a,evidence:a.evidence&&publicText(a.evidence)?a.evidence:null})),
  }]];
 }));
 return {...rest,...(analysis.company?{company:{...analysis.company,description:analysis.company.description&&gapWording.test(analysis.company.description)?null:analysis.company.description,about:analysis.company.about&&gapWording.test(analysis.company.about)?null:analysis.company.about}}:{}),events:analysis.events?.filter(e=>publicText(e.note)),status:short?'insufficient_data':rest.status,tests,
  ...(hideValue?{valuation:null,valuationReason:null,valueHistory:[],b:false}:{
   valuation:analysis.valuation?{...analysis.valuation,assumptions:analysis.valuation.assumptions.filter(publicText),bondFlags:analysis.valuation.bondFlags?.filter(publicText)}:null,
   valuationReason:null,
  }),
  historyAssumptions:analysis.historyAssumptions?.filter(publicText),
 } as T;
}
