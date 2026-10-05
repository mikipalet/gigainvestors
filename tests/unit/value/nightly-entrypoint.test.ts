import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,expect,it} from 'vitest';
const roots:string[]=[];
afterEach(()=>roots.splice(0).forEach(root=>rmSync(root,{recursive:true,force:true})));
it('the real CLI stops fundamentals at its ceiling and leaves yields and analysis runnable',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'nightly-entry-'));roots.push(root);
 const date=new Date().toISOString().slice(0,10);
 mkdirSync(path.join(root,'usage'));mkdirSync(path.join(root,'store'));
 const rows=['A.US','B.US'].map(id=>({id,code:id.slice(0,1),name:id,exchange:'US',country:'US',currency:'USD',source:'eodhd',kind:'operating',marketCapUsd:100}));
 writeFileSync(path.join(root,'universe.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
 writeFileSync(path.join(root,`usage/eodhd-${date}.json`),JSON.stringify({date,used:59990,history:0}));
 const transport=path.join(root,'transport.mjs');
 writeFileSync(transport,`
  import {appendFileSync} from 'node:fs';
  globalThis.fetch=async input=>{
   const url=new URL(String(input));
   if(url.hostname!=='eodhd.com')throw Error('Unexpected network request');
   appendFileSync(process.env.VALUE_CORPUS_DIR+'/requests.jsonl',JSON.stringify(url.pathname)+'\\n');
   if(url.pathname==='/api/user')return Response.json({apiRequests:59990});
   if(url.pathname==='/api/fundamentals/A.US')return Response.json({});
   if(url.pathname==='/api/eod/US10Y.GBOND')return Response.json([{date:'${date}',close:4}]);
   throw Error('Unexpected EODHD request');
  };
 `);
 const run=(stage:string,args:string[]=[],offline=false)=>spawnSync(process.execPath,['--conditions=react-server','--import',transport,'--import','tsx','scripts/value/cli.ts',stage,...args],{encoding:'utf8',timeout:15000,env:{...process.env,VALUE_CORPUS_DIR:root,VALUE_STORE_DIR:path.join(root,'store'),VALUE_NO_EODHD:offline?'1':'0',VALUE_EODHD_HARD_CAP:'100000',EODHD_API_KEY:'fixture',JEV_API_KEY:''}});
 const f=run('fundamentals',['--nightly']);
 expect(f.status,f.stderr).toBe(0);expect(f.stdout).toContain('attempted=1; written=1');
 expect(f.stdout).toContain('ceiling=60000');
 expect(JSON.parse(readFileSync(path.join(root,`usage/eodhd-${date}.json`),'utf8')).used).toBe(60000);
 expect(readFileSync(path.join(root,'requests.jsonl'),'utf8')).not.toContain('fundamentals/B.US');
 const y=run('yields');expect(y.status,y.stderr).toBe(0);
 expect(JSON.parse(readFileSync(path.join(root,`usage/eodhd-${date}.json`),'utf8')).used).toBe(60001);
 const a=run('analyze',[],true);expect(a.status,a.stderr).toBe(0);expect(a.stdout).toContain('1 written, 0 unchanged, 0 failed');
 expect(JSON.parse(readFileSync(path.join(root,'analysis/A.US.json'),'utf8')).asOf).toContain(date);
 const s=run('status',[],true);expect(s.status,s.stderr).toBe(0);expect(JSON.parse(s.stdout).analysed).toBe(1);
},30000);
