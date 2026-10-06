import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {approvedIds, critical, samplePages, workingArchive, type Coverage} from './publication-coverage';

/** Use ordinary React, even when the publishing CLI runs with react-server conditions. */
export function assertCandidatePages(repo:string,before:Coverage,after:Coverage,baseline:string):void {
 const approved=approvedIds(baseline,'pages'),logoApprovals=approvedIds(baseline,'logos');
 const samples=samplePages(before.pages.length?before:after).filter(p=>!approved.has(p.id));
 const current=new Map(after.pages.map(p=>[p.id,p]));
 const aliases=workingArchive(repo).read('aliases.json')??{};
 const input=samples.map(p=>({...p,file:current.get(aliases[p.id]??p.id)?.file??p.file,logo:logoApprovals.has(p.id)?current.get(p.id)?.logo??null:current.get(p.id)?.logo||p.logo}));
 let result;
 try{
  const env={...process.env};delete env.NODE_OPTIONS;
  result=JSON.parse(execFileSync(process.execPath,['--require',path.join(__dirname,'render-publication-styles.cjs'),'--import','tsx',path.join(__dirname,'render-publication-pages.ts'),repo],{input:JSON.stringify(input),encoding:'utf8',stdio:['pipe','pipe','pipe'],env,maxBuffer:4*1024*1024,timeout:120_000}));
 }catch{critical(`pages renderer failed; ids=${samples.map(p=>p.id).join(',')}`);}
 if(result.failed.length)critical(`pages failed; ids=${result.failed.join(',')}`);
 console.log(`coverage: pages=${result.passed}/${input.length} rendered; logo img checked`);
}
