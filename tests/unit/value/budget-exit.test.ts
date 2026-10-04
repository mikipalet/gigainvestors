import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,expect,it} from 'vitest';
const roots:string[]=[];
afterEach(()=>roots.splice(0).forEach(root=>rmSync(root,{recursive:true,force:true})));
it('the real CLI reports exhausted yields as exit 75 before making an HTTP request',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'value-budget-exit-'));roots.push(root);
 const date=new Date().toISOString().slice(0,10);mkdirSync(path.join(root,'usage'));
 writeFileSync(path.join(root,'universe.jsonl'),JSON.stringify({id:'A.US',country:'US'})+'\n');
 writeFileSync(path.join(root,`usage/eodhd-${date}.json`),JSON.stringify({date,used:100000,history:15000}));
 const result=spawnSync(process.execPath,['--import','tsx','scripts/value/cli.ts','yields'],{encoding:'utf8',env:{...process.env,VALUE_CORPUS_DIR:root,EODHD_API_KEY:'fixture',VALUE_NO_EODHD:'0'}});
 expect(result.status).toBe(75);expect(result.stderr).toContain('daily EODHD budget reached');
 writeFileSync(path.join(root,'universe.jsonl'),'malformed');
 const failed=spawnSync(process.execPath,['--import','tsx','scripts/value/cli.ts','yields'],{encoding:'utf8',env:{...process.env,VALUE_CORPUS_DIR:root}});
 expect(failed.status).toBe(1);
});
