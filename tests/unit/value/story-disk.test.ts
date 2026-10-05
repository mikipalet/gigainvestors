import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const disk=vi.hoisted(()=>({kib:100,free:10*1024**3}));
vi.mock('node:child_process',()=>({execFileSync:()=>`${disk.kib}\tworktree\n0\tstories\n`}));
vi.mock('node:fs',async importOriginal=>({...await importOriginal<typeof import('node:fs')>(),statfsSync:()=>({bavail:disk.free,bsize:1})}));
let root:string;
beforeEach(()=>{
 vi.resetModules();vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-05T03:00:00Z'));
 root=mkdtempSync(path.join(tmpdir(),'story-disk-'));vi.stubEnv('VALUE_CORPUS_DIR',root);
 disk.kib=100;disk.free=10*1024**3;
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();rmSync(root,{recursive:true,force:true});});
it('uses an independent nightly baseline while preserving and rejecting another worktree ledger',async()=>{
 const {storyDiskGuard}=await import('@/lib/value/price-story/corpus');
 storyDiskGuard();
 const file=path.join(root,'price-story/disk-budget.json');
 const old=JSON.stringify({baselineBytes:1,worktree:'/old-worktree'});writeFileSync(file,old);
 vi.advanceTimersByTime(10001);
 expect(()=>storyDiskGuard()).toThrow('another worktree');
 vi.stubEnv('STORY_DISK_LEDGER','disk-budget-nightly-2026-10-05.json');
 storyDiskGuard();
 expect(JSON.parse(readFileSync(path.join(root,'price-story/disk-budget-nightly-2026-10-05.json'),'utf8'))).toMatchObject({baselineBytes:102400,worktree:process.cwd(),newBytes:0});
 expect(readFileSync(file,'utf8')).toBe(old);
});
it('retains the baseline across restarts and never bypasses a rejected growth check',async()=>{
 vi.stubEnv('STORY_DISK_LEDGER','disk-budget-nightly-2026-10-05.json');vi.stubEnv('STORY_MAX_NEW_BYTES','1024');
 (await import('@/lib/value/price-story/corpus')).storyDiskGuard();
 disk.kib=102;vi.resetModules();
 const {storyDiskGuard}=await import('@/lib/value/price-story/corpus');
 expect(()=>storyDiskGuard()).toThrow('new-artifact ceiling');
 expect(()=>storyDiskGuard()).toThrow(/DISK STOP/);
});
it('checks free space even within the scan interval and remains stopped',async()=>{
 const {storyDiskGuard}=await import('@/lib/value/price-story/corpus');storyDiskGuard();
 disk.free=5*1024**3;expect(()=>storyDiskGuard()).toThrow('free-space floor');
 disk.free=10*1024**3;expect(()=>storyDiskGuard()).toThrow('already crossed its floor');
});
