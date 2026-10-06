import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {expect,it,afterEach} from 'vitest';
import {measureCoverage,workingArchive} from '@/scripts/value/publication-coverage';
import {assertCandidatePages} from '@/scripts/value/publication-pages';
const roots:string[]=[];
afterEach(()=>roots.splice(0).forEach(r=>rmSync(r,{recursive:true,force:true})));
function fixture(){
 const root=mkdtempSync(path.join(tmpdir(),'coverage-pages-'));roots.push(root);mkdirSync(path.join(root,'dossiers'));
 const d=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'];d.company.logo='https://example.com/logo.png';
 const dossiers=Object.fromEntries(Array.from({length:25},(_,i)=>{const id=`C${i}.US`;return [id,{...structuredClone(d),id,company:{...d.company,id}}];}));
 writeFileSync(path.join(root,'meta.json'),'{}');const file=path.join(root,'dossiers/000.json');writeFileSync(file,JSON.stringify(dossiers));
 return {root,file,dossiers};
}
it('renders 20 actual company pages including logo img markup in a separate React process',()=>{
 const {root}=fixture(),coverage=measureCoverage(workingArchive(root));
 expect(()=>assertCandidatePages(root,coverage,coverage,'a'.repeat(40))).not.toThrow();
},15000);
it.each(['logo','broken'])('fails closed with sampled ids when %s rendering regresses',broken=>{
 const {root,file,dossiers}=fixture(),before=measureCoverage(workingArchive(root));
 if(broken==='logo')dossiers['C0.US'].company.logo=null;else dossiers['C0.US'].tests=null;
 writeFileSync(file,JSON.stringify(dossiers));const after=measureCoverage(workingArchive(root));
 expect(()=>assertCandidatePages(root,before,after,'a'.repeat(40))).toThrow(/CRITICAL.*pages.*C0.US/);
},15000);
