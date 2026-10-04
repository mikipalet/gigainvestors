import {afterEach,expect,it} from 'vitest';
import {spawn,type ChildProcess} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const roots:string[]=[],children:ChildProcess[]=[];
afterEach(()=>{for(const child of children.splice(0))if(child.exitCode===null)child.kill();for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
it('waits without changing a live nightly lock and releases only its own lock after handoff',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'coverage-lock-'));roots.push(root);
 const lock=path.join(root,'daily-runner.lock');mkdirSync(lock);writeFileSync(path.join(lock,'pid'),`${process.pid}\n`);
 const marker=path.join(root,'executed');
 const child=spawn('bash',['scripts/value/with-daily-lock.sh',process.execPath,'-e',`require('fs').writeFileSync(${JSON.stringify(marker)},process.env.VALUE_DAILY_LOCK_PID)`],{env:{...process.env,VALUE_CORPUS_DIR:root},stdio:'pipe'});children.push(child);
 const done=new Promise<number|null>((resolve,reject)=>{child.on('exit',resolve);child.on('error',reject);});
 await new Promise(r=>setTimeout(r,150));
 expect(existsSync(marker)).toBe(false);expect(readFileSync(path.join(lock,'pid'),'utf8')).toBe(`${process.pid}\n`);
 rmSync(lock,{recursive:true});
 expect(await done).toBe(0);expect(Number(readFileSync(marker,'utf8'))).toBe(child.pid);expect(existsSync(lock)).toBe(false);
},10000);
