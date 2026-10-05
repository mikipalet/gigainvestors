import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,expect,it} from 'vitest';
const roots:string[]=[];
afterEach(()=>roots.splice(0).forEach(root=>rmSync(root,{recursive:true,force:true})));
it.each([{conditions:[]},{conditions:['--conditions=react-server']}])('runs the status CLI without web-only dependencies (%j)',({conditions})=>{
 const root=mkdtempSync(path.join(tmpdir(),'status-entry-'));roots.push(root);
 mkdirSync(path.join(root,'store'));
 writeFileSync(path.join(root,'universe.jsonl'),JSON.stringify({id:'A.US',country:'US'})+'\n');
 writeFileSync(path.join(root,'store/meta.json'),JSON.stringify({asOf:'2026-10-05',counts:{analysed:7}}));
 const result=spawnSync(process.execPath,[...conditions,'--import','tsx','scripts/value/cli.ts','status'],{encoding:'utf8',env:{...process.env,VALUE_CORPUS_DIR:root,VALUE_STORE_DIR:path.join(root,'store'),VALUE_NO_EODHD:'1'},timeout:15000});
 expect(result.stderr).toBe('');expect(result.status).toBe(0);
 expect(JSON.parse(result.stdout)).toMatchObject({universe:1,published:{count:7,source:'published store'}});
});
