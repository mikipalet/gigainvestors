vi.mock('@/scripts/value/blob-publish',()=>({uploadPublishedSnapshot:vi.fn(async()=>({}))}));
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import publish, {prepareRepository} from '@/scripts/value/stages/publish';
// Only adapt the fixed production origin check. All Git operations use real local repositories.
vi.mock('node:child_process',async importOriginal=>{
 const actual=await importOriginal<typeof import('node:child_process')>();
 return {...actual,execFileSync:(command:string,args:string[],options:any)=>command==='git'&&args.includes('get-url')?'https://github.com/mikipalet/gigainvestors-value-data.git':actual.execFileSync(command,args,options)};
});
let root:string|undefined;
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();if(root)rmSync(root,{recursive:true,force:true});});
it('budget fallback publishes the released tree without loading changed or invalid local analysis',async()=>{
 root=mkdtempSync(path.join(tmpdir(),'existing-analysis-'));vi.stubEnv('VALUE_CORPUS_DIR',root);
 vi.stubEnv('VALUE_REVALIDATE_URL','');vi.stubEnv('VALUE_REVALIDATE_SECRET','');vi.stubGlobal('fetch',()=>{throw new Error('Unexpected HTTP');});
 const repo=path.join(root,'publish-repo'),remote=path.join(root,'remote');mkdirSync(repo);mkdirSync(remote);
 const git=(dir:string,...args:string[])=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(remote,'init','--bare','-b','main');git(repo,'init','-b','main');git(repo,'config','user.name','Test');git(repo,'config','user.email','test@example.com');
 const write=(file:string,value:unknown)=>{mkdirSync(path.dirname(path.join(repo,file)),{recursive:true});writeFileSync(path.join(repo,file),JSON.stringify(value));};
 const view='views/0123456789abcdef01234567.json';write(view,{});
 write('meta.json',{views:{current:view,deferred:[],quarters:{'2018Q3':view},quarterDeferred:{'2018Q3':[]},years:{},yearDeferred:{}}});
 write('history/index.json',{years:[],quarters:['2018Q3']});write('history/2018Q3.json',[]);
 write('index/default.json',[]);write('index/US.json',[]);write('dossiers/000.json',{'A.US':{id:'A.US',memo:'released analysis'}});
 git(repo,'add','.');git(repo,'commit','-m','released');git(repo,'remote','add','origin',remote);git(repo,'push','-u','origin','main');
 const tree=git(repo,'rev-parse','HEAD^{tree}');
 mkdirSync(path.join(root,'analysis'));writeFileSync(path.join(root,'analysis/A.US.json'),'invalid partial research');
 await publish({existingAnalysis:true});
 expect(git(repo,'rev-parse','HEAD^{tree}')).toBe(tree);
 expect(git(remote,'rev-parse','main^{tree}')).toBe(tree);
 expect(git(repo,'status','--porcelain')).toBe('');
 // A manual second stage cannot reset or rewrite an unverified publication.
 writeFileSync(path.join(repo,'review-marker.txt'),'do not discard');
 expect(()=>prepareRepository()).toThrow('Pending publication');
 expect(git(repo,'status','--porcelain')).toContain('review-marker.txt');
});
