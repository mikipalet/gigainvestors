vi.mock('@/scripts/value/blob-publish',()=>({uploadPublishedSnapshot:vi.fn(async()=>({}))}));
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {beginPublication,verifyPublication} from '@/scripts/value/post-publish';
let root:string,repo:string,remote:string;
const git=(dir:string,...args:string[])=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(file:string,data:unknown)=>{mkdirSync(path.dirname(path.join(repo,file)),{recursive:true});writeFileSync(path.join(repo,file),JSON.stringify(data));};
let before:string;
beforeEach(()=>{
 root=mkdtempSync(path.join(tmpdir(),'post-publish-'));repo=path.join(root,'repo');remote=path.join(root,'remote');mkdirSync(repo);mkdirSync(remote);
 git(remote,'init','--bare','-b','main');git(repo,'init','-b','main');git(repo,'config','user.name','Test');git(repo,'config','user.email','test@example.com');
 const view='views/0123456789abcdef01234567.json';write(view,{});
 write('meta.json',{views:{current:view,deferred:[],years:{},yearDeferred:{},quarters:{'2018Q3':view},quarterDeferred:{'2018Q3':[]}}});
 write('history/index.json',{years:[],quarters:['2018Q3']});write('history/2018Q3.json',[]);
 git(repo,'add','.');git(repo,'commit','-m','good');git(repo,'remote','add','origin',remote);git(repo,'push','-u','origin','main');before=git(repo,'rev-parse','HEAD');
});
afterEach(()=>rmSync(root,{recursive:true,force:true}));
function candidate(orphan=false){
 if(orphan)git(repo,'checkout','--orphan','new');
 write('meta.json',{...JSON.parse(readFileSync(path.join(repo,'meta.json'),'utf8')),asOf:'new'});git(repo,'add','.');git(repo,'commit','-m','candidate');if(orphan)git(repo,'branch','-M','main');
 beginPublication(repo);git(repo,'push','--force','origin','main');return git(repo,'rev-parse','HEAD');
}
it.each([false,true])('reverts the failed pushed snapshot (orphan=%s), republishes and revalidates the prior tree',async orphan=>{
 const bad=candidate(orphan),revalidate=vi.fn(async()=>{}),check=vi.fn(async()=>{throw new Error('quarter never loaded');});
 await expect(verifyPublication(repo,{check,revalidate})).rejects.toThrow(/CRITICAL.*reverted/);
 expect(git(repo,'rev-parse','HEAD')).not.toBe(bad);
 expect(git(repo,'rev-parse','HEAD^{tree}')).toBe(git(repo,'rev-parse',`${before}^{tree}`));
 expect(git(remote,'rev-parse','main')).toBe(git(repo,'rev-parse','HEAD'));expect(revalidate).toHaveBeenCalledTimes(2);
});
it('checks a successful publication once and clears the durable receipt',async()=>{
 candidate();const check=vi.fn(async()=>{}),revalidate=vi.fn(async()=>{});
 await verifyPublication(repo,{check,revalidate});await verifyPublication(repo,{check,revalidate});
 expect(check).toHaveBeenCalledOnce();expect(revalidate).toHaveBeenCalledOnce();
});
it('does not check or revert a failed push',async()=>{
 write('meta.json',{unpublished:true});git(repo,'add','.');git(repo,'commit','-m','unpublished');beginPublication(repo);
 const check=vi.fn(async()=>{});await verifyPublication(repo,{check,revalidate:async()=>{}});expect(check).not.toHaveBeenCalled();
 expect(git(remote,'rev-parse','main')).toBe(before);
});
it('refuses to revert if another writer advanced the remote',async()=>{
 candidate();const other=path.join(root,'other');git(root,'clone',remote,other);git(other,'config','user.name','Test');git(other,'config','user.email','test@example.com');writeFileSync(path.join(other,'new.txt'),'external');git(other,'add','.');git(other,'commit','-m','external');git(other,'push');
 const external=git(remote,'rev-parse','main');
 await expect(verifyPublication(repo,{check:async()=>{},revalidate:async()=>{}})).rejects.toThrow(/CRITICAL.*moved/);
 expect(git(remote,'rev-parse','main')).toBe(external);
});
it('rolls back when revalidation fails, without declaring an unvalidated site healthy',async()=>{
 candidate();let calls=0;
 await expect(verifyPublication(repo,{check:async()=>{},revalidate:async()=>{if(++calls===1)throw new Error('revalidation failed');}})).rejects.toThrow(/CRITICAL.*reverted/);
 expect(git(repo,'rev-parse','HEAD^{tree}')).toBe(git(repo,'rev-parse',`${before}^{tree}`));
});
