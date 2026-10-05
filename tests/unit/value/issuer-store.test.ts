import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import {getDossier} from '../../../lib/value/store';
import {shardOf} from '../../../lib/value/shard';
const dirs:string[]=[];
afterEach(()=>{vi.unstubAllEnvs();for(const dir of dirs)rmSync(dir,{recursive:true,force:true});});
it('resolves paid API dossier aliases with union holders while keeping stored freeze bytes unchanged',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'issuer-store-'));dirs.push(dir);vi.stubEnv('VALUE_STORE_DIR',dir);
 const dossier:any=Object.values(JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/'+shardOf('KO.US')+'.json','utf8'))).find((d:any)=>d.id==='KO.US');
 mkdirSync(path.join(dir,'dossiers'));
 const bytes=JSON.stringify({'KO.US':dossier});writeFileSync(path.join(dir,'dossiers',shardOf('KO.US')+'.json'),bytes);
 writeFileSync(path.join(dir,'aliases.json'),JSON.stringify({'ADR.US':'KO.US'}));
 writeFileSync(path.join(dir,'issuer-holders.json'),JSON.stringify({'KO.US':[{code:'BRK',name:'Warren Buffett'},{code:'GR',name:'Thomas Russo'}]}));
 expect(await getDossier('adr.us')).toMatchObject({id:'KO.US',holders:[{code:'BRK'},{code:'GR'}]});
 expect(readFileSync(path.join(dir,'dossiers',shardOf('KO.US')+'.json'),'utf8')).toBe(bytes);
});
