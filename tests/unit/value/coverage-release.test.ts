import {afterEach,expect,it,vi} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeCorpusJson} from '@/lib/value/corpus';
import {additionInputProblems,assertAdditionBinding,readCoverageRelease,baselineAnalysisHash,unchangedCoverageBaselineIds} from '@/scripts/value/coverage-release';
const roots:string[]=[];
afterEach(()=>{vi.unstubAllEnvs();for(const r of roots.splice(0))rmSync(r,{recursive:true,force:true});});
function fixture(){
 const root=mkdtempSync(path.join(os.tmpdir(),'coverage-release-'));roots.push(root);vi.stubEnv('VALUE_CORPUS_DIR',root);
 const a:any={id:'NEW.US',asOf:'2026-10-04',versions:{pipeline:'27',questions:'2'},reportingCurrency:'USD',ownerMemo:{inputHash:'abc'},report:{kind:'10-K',sections:['business']},series:{revenue:[[2025,100]]},tests:{understandable:{series:{revenue:[[2025,100]]}}}};
 writeCorpusJson('fundamentals/NEW.US.json',{years:[{year:2025}]});
 writeCorpusJson('analysis/NEW.US.json',a);writeCorpusJson('analysis/inputs/NEW.US.json',{asOf:a.asOf,sections:{business:'Full filing text'},memoYears:[{year:2025}]});
 writeCorpusJson('reports/NEW.US/meta.json',a.report);writeCorpusJson('prices-history/NEW.US.json',[['2026-09',10]]);
 return a;
}
it('holds description-only inputs and missing or stale prices and history',()=>{
 fixture();const quote:any=[10,'2026-10-02','eodhd'];const now=Date.parse('2026-10-04');
 expect(additionInputProblems('NEW.US',quote,now)).toEqual([]);
 writeCorpusJson('reports/NEW.US/meta.json',{kind:'description',sections:['description']});
 writeCorpusJson('prices-history/NEW.US.json',[]);
 expect(additionInputProblems('NEW.US',[10,'2025-10-01','seed'],now)).toEqual(expect.arrayContaining(['full-filing','current-price','price-history']));
});
it('rejects a changed memo input binding and changed exposed series',()=>{
 const a=fixture();expect(()=>assertAdditionBinding(a,a)).not.toThrow();
 expect(()=>assertAdditionBinding(a,{...a,ownerMemo:{inputHash:'old'}})).toThrow(/binding/);
 expect(()=>assertAdditionBinding(a,{...a,series:{revenue:[[2025,200]]}})).toThrow(/binding/);
});
it('rejects ambiguous release manifests instead of silently shipping held ids',()=>{
 fixture();writeCorpusJson('held-membership/release.json',{version:1,baselineIds:['OLD.US'],additionIds:['NEW.US'],held:[{id:'NEW.US',reasons:['full-filing']}]});
 expect(()=>readCoverageRelease()).toThrow(/release/);
});

it('retains unchanged baseline research but allows a newly analyzed baseline to refresh',()=>{
 const a=fixture();writeCorpusJson('analysis/OLD.US.json',{...a,id:'OLD.US'});
 writeCorpusJson('held-membership/release.json',{version:1,baselineIds:['OLD.US'],baselineAnalysisHashes:{'OLD.US':baselineAnalysisHash('OLD.US')},additionIds:['NEW.US'],held:[]});
 expect(unchangedCoverageBaselineIds()).toEqual(['OLD.US']);
 writeCorpusJson('analysis/OLD.US.json',{...a,id:'OLD.US',asOf:'2026-10-05'});
 expect(unchangedCoverageBaselineIds()).toEqual([]);
 expect(readCoverageRelease()!.baselineIds).toEqual(['OLD.US']);
});
