import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {afterEach,expect,it} from 'vitest';
const roots:string[]=[];
afterEach(()=>roots.splice(0).forEach(r=>rmSync(r,{recursive:true,force:true})));
function run(codes:Record<string,number>){
 const root=mkdtempSync(path.join(tmpdir(),'daily-runner-'));roots.push(root);
 mkdirSync(path.join(root,'scripts/value'),{recursive:true});mkdirSync(path.join(root,'bin'));mkdirSync(path.join(root,'corpus'));
 copyFileSync('scripts/value/run-daily.sh',path.join(root,'scripts/value/run-daily.sh'));
 writeFileSync(path.join(root,'bin/node'),`#!/usr/bin/env bash
if [[ "$1" == "-e" ]]; then
 if [[ "$2" == *'dotenv'* ]]; then echo "$VALUE_CORPUS_DIR"; fi
 exit 0
fi
if [[ "$3" == *'daily-japan.ts' ]]; then echo 2026-10-03; exit 0; fi
if [[ "$3" == *'post-publish'* ]]; then echo LIVE-CHECK >> "$TRACE"; exit "${codes.live??0}"; fi
stage="$4"
if [[ "$stage" == "price-story" ]]; then echo "LEDGER=$STORY_DISK_LEDGER" >> "$TRACE"; fi
shift 4
echo "$stage $*" >> "$TRACE"
case "$stage" in
${Object.entries(codes).map(([s,n])=>`${s}) exit ${n};;`).join('\n')}
esac
exit 0
`,{mode:0o755});
 writeFileSync(path.join(root,'bin/date'),'#!/usr/bin/env bash\necho 2026-10-05\n',{mode:0o755});
 let code=0;
 try{execFileSync('bash',[path.join(root,'scripts/value/run-daily.sh'),'--once'],{env:{...process.env,PATH:`${root}/bin:${process.env.PATH}`,VALUE_CORPUS_DIR:path.join(root,'corpus'),TRACE:path.join(root,'trace'),STORY_DISK_LEDGER:'disk-budget-old-worktree.json'},stdio:'pipe'});}catch(e){code=(e as {status:number}).status;}
 return {trace:readFileSync(path.join(root,'trace'),'utf8'),code};
}
it('publishes existing analysis after yields and thesis exhaust their budgets',()=>{
 const {trace}=run({yields:75,thesis:75});
 expect(trace).not.toMatch(/^analyze /m);expect(trace).toContain('publish --existing-analysis');
});
it('also publishes existing analysis after an unconfirmed provider reset and thesis budget exhaustion',()=>{
 expect(run({'wait-eodhd-reset':1,thesis:75}).trace).toContain('publish --existing-analysis');
});
it('does not hide a non-budget thesis failure',()=>{
 expect(run({thesis:1}).trace).not.toMatch(/^publish /m);
});
it('runs the live check after prices and publish, including a partial prices exit',()=>{
 const {trace}=run({prices:1});
 expect(trace).toMatch(/prices \nLIVE-CHECK/);expect(trace).toMatch(/publish \nLIVE-CHECK/);
});
it('stops the cycle loudly when post-publication verification or rollback fails',()=>{
 const result=run({live:1});expect(result.code).not.toBe(0);expect(result.trace).not.toMatch(/^price-history /m);
});

it('passes a UTC-cycle-specific ledger to price-story instead of inheriting an old worktree ledger',()=>{
 const {trace,code}=run({});
 expect(code).toBe(0);
 expect(trace).toContain('LEDGER=disk-budget-nightly-2026-10-05.json');
});
