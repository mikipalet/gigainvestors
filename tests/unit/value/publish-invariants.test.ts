import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {commitPrices} from '@/scripts/value/stages/prices';
import {commitOutput} from '@/scripts/value/stages/publish';
let repo:string;
const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(file:string,data:unknown)=>{mkdirSync(path.dirname(path.join(repo,file)),{recursive:true});writeFileSync(path.join(repo,file),JSON.stringify(data));};
const read=(file:string)=>JSON.parse(readFileSync(path.join(repo,file),'utf8'));
const view='views/0123456789abcdef01234567.json';
beforeEach(()=>{
 repo=mkdtempSync(path.join(tmpdir(),'publish-invariants-'));git('init','-b','main');git('config','user.name','Test');git('config','user.email','test@example.com');
 write(view,{});write('meta.json',{views:{current:view,deferred:[],quarters:{'2018Q3':view},quarterDeferred:{'2018Q3':[]},years:{2018:view},yearDeferred:{2018:[]}}});
 write('history/index.json',{years:[2018],quarters:['2018Q3']});write('history/2018Q3.json',[]);write('history/2018.json',[]);
 const row={id:'A.US',st:'s',t:'PPPPP',v:[80,100,120],m:.2,b:false,buyReturnInputs:{cashPerShare:10,growth:0,requiredReturn:.1}};
 write('index/US.json',[row]);write('index/default.json',[row]);write('prices/US.json',{'A.US':[100,'2026-10-01']});
 write('dossiers/000.json',Object.fromEntries(Array.from({length:100},(_,i)=>[`C${i}.US`,{id:`C${i}.US`}] )));
 git('add','.');git('commit','-m','baseline');
});
afterEach(()=>rmSync(repo,{recursive:true,force:true}));
it('permits added-company buys while preserving the price-only rule for existing companies',()=>{
 const ds=read('dossiers/000.json');ds['NEW.US']={id:'NEW.US'};write('dossiers/000.json',ds);
 for(const file of ['index/US.json','index/default.json']){const rows=read(file);rows.push({...rows[0],id:'NEW.US',b:true});write(file,rows);}
 expect(commitOutput({repo,asOf:'2026-10-04'})).toBe(true);
});
for(const [stage,commit]of [['prices',commitPrices],['publish',commitOutput]] as const){
 it.each(['quarters','yearDeferred','missing-file','dossiers','buy','history'])('%s refuses '+stage+' commit before changing HEAD or index',failure=>{
  const head=git('rev-parse','HEAD');
  if(failure==='quarters'){const meta=read('meta.json');meta.views.quarters={};write('meta.json',meta);}
  if(failure==='yearDeferred'){const meta=read('meta.json');meta.views.yearDeferred={};write('meta.json',meta);}
  if(failure==='missing-file')rmSync(path.join(repo,view));
  if(failure==='dossiers'){const ds=read('dossiers/000.json');delete ds['C0.US'];delete ds['C1.US'];write('dossiers/000.json',ds);}
  if(failure==='buy'){for(const f of ['index/US.json','index/default.json']){const rows=read(f);rows[0].b=true;write(f,rows);}}
  if(failure==='history'){write('history/index.json',{years:[],quarters:[]});const m=read('meta.json');m.views.quarters={};m.views.years={};write('meta.json',m);}
  expect(()=>commit({repo,asOf:'2026-10-04'})).toThrow(/invariant/i);
  expect(git('rev-parse','HEAD')).toBe(head);expect(git('diff','--cached','--name-only')).toBe('');
 });
 it(stage+' permits an exactly 1% dossier drop and a price-explained Buy-now transition',()=>{
  const ds=read('dossiers/000.json');delete ds['C0.US'];write('dossiers/000.json',ds);
  write('prices/US.json',{'A.US':[50,'2026-10-02']});
  for(const f of ['index/US.json','index/default.json']){const rows=read(f);rows[0].b=true;write(f,rows);}
  expect(commit({repo,asOf:'2026-10-04'})).toBe(true);
 });
}
it('does not let pre-staged unrelated changes bypass the prices gate',()=>{
 write('history/index.json',{years:[],quarters:[]});git('add','history/index.json');
 write('prices/US.json',{'A.US':[99,'2026-10-02']});
 expect(()=>commitPrices({repo,asOf:'2026-10-04'})).toThrow(/invariant/i);
});
it('accepts year views derived from Q4 without requiring a separate annual snapshot',()=>{
 const meta=read('meta.json');meta.views.years={'2018':view};meta.views.quarters={'2018Q4':view};meta.views.quarterDeferred={'2018Q4':[]};write('meta.json',meta);
 write('history/index.json',{years:[],quarters:['2018Q4']});write('history/2018Q4.json',[]);rmSync(path.join(repo,'history/2018.json'));
 git('add','.');git('commit','-m','quarter-only baseline');
 write('prices/US.json',{'A.US':[99,'2026-10-02']});
 expect(commitPrices({repo,asOf:'2026-10-04'})).toBe(true);
});
it('allows a reviewed identity collapse only when every lost dossier has a direct live target',()=>{
 const ds=read('dossiers/000.json');delete ds['C0.US'];delete ds['C1.US'];write('dossiers/000.json',ds);
 write('aliases.json',{'C0.US':'C2.US','C1.US':'C2.US'});
 expect(commitOutput({repo,asOf:'2026-10-05'})).toBe(true);
});
it('refuses alias cycles or missing canonical dossiers',()=>{
 const ds=read('dossiers/000.json');delete ds['C0.US'];delete ds['C1.US'];write('dossiers/000.json',ds);
 write('aliases.json',{'C0.US':'C1.US','C1.US':'C0.US'});
 expect(()=>commitOutput({repo,asOf:'2026-10-05'})).toThrow(/invariant/i);
});
it('refuses to reintroduce two reviewed listings of one issuer',()=>{
 const ds=read('dossiers/000.json');ds['NSRGY.US']={id:'NSRGY.US'};ds['NESN.SW']={id:'NESN.SW'};write('dossiers/000.json',ds);
 expect(()=>commitOutput({repo,asOf:'2026-10-05'})).toThrow(/duplicate issuer/i);
});
