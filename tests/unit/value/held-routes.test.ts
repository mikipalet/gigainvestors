import {afterEach,describe,expect,it,vi} from 'vitest';
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {getDossier,getAllAnalyzedIndex} from '@/lib/value/store';
import {shardOf} from '@/lib/value/shard';
const roots:string[]=[];
function fixture(files:Record<string,unknown>){
 const root=mkdtempSync(path.join(os.tmpdir(),'held-route-'));roots.push(root);vi.stubEnv('VALUE_STORE_DIR',root);
 for(const [file,data]of Object.entries(files)){mkdirSync(path.dirname(path.join(root,file)),{recursive:true});writeFileSync(path.join(root,file),JSON.stringify(data));}
}
afterEach(()=>{vi.unstubAllEnvs();for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
describe('held stock routes',()=>{
 it('resolves an existing US receipt alias without reanalysing its issuer',async()=>{
  const d={id:'9988.HK',company:{name:'Alibaba'},tests:{},series:{}};
  fixture({'aliases.json':{'BABA.US':'9988.HK'},[`dossiers/${shardOf('9988.HK')}.json`]:{'9988.HK':d}});
  expect((await getDossier('BABA.US'))?.id).toBe('9988.HK');
 });
 it('resolves 13F share-class punctuation',async()=>{
  const d={id:'BRK-B.US',company:{name:'Berkshire'},tests:{},series:{}};
  fixture({[`dossiers/${shardOf('BRK-B.US')}.json`]:{'BRK-B.US':d}});
  expect((await getDossier('BRK.B.US'))?.id).toBe('BRK-B.US');
 });
 it('catalogues every country row even when absent from the default index',async()=>{
  fixture({'meta.json':{funnel:{byCountry:{US:{},GB:{}}}},'index/default.json':[{id:'A.US'}],'index/US.json':[{id:'A.US'},{id:'PLXS.US'}],'index/GB.json':[{id:'B.LSE'}]});
  expect((await getAllAnalyzedIndex()).map(r=>r.id).sort()).toEqual(['A.US','B.LSE','PLXS.US']);
 });
});
