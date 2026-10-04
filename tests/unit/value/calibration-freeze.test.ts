import {expect,it,vi} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeCorpusJson} from '@/lib/value/corpus';
import {shardOf} from '@/lib/value/shard';
import calibrate from '@/scripts/value/stages/calibrate';
it('calibrates the frozen released verdict instead of a rejected cached verdict before publication',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'calibration-freeze-')),oldExit=process.exitCode;
 vi.stubEnv('VALUE_CORPUS_DIR',root);vi.spyOn(console,'table').mockImplementation(()=>{});vi.spyOn(console,'log').mockImplementation(()=>{});
 try{
  const tests=Object.fromEntries(['understandable','moat','economics','management','accounting'].map(key=>[key,{result:'pass'}]));
  const released={id:'AXP.US',status:'scored',tests:{...tests,price:{result:'fail'}}};
  writeCorpusJson(`publish-repo/dossiers/${shardOf(released.id)}.json`,{[released.id]:released});
  writeCorpusJson('analysis/AXP.US.json',{...released,tests:{...tests,moat:{result:'fail'}}});
  writeCorpusJson('verdict-freeze.json',{version:1,ids:['AXP.US']});
  process.exitCode=0;await calibrate({existing:true,only:['AXP.US']});expect(process.exitCode).toBe(0);
  writeCorpusJson('verdict-freeze.json',{version:1,ids:[]});
  process.exitCode=0;await calibrate({existing:true,only:['AXP.US']});expect(process.exitCode).toBe(1);
 }finally{process.exitCode=oldExit;vi.unstubAllEnvs();vi.restoreAllMocks();rmSync(root,{recursive:true,force:true});}
});
