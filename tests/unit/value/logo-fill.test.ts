import {it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {vi} from 'vitest';
import {fillPublishedLogos} from '@/lib/value/logo-fill';
import {iconHash} from '@/lib/value/logo-validation';
it.each(['pending','rejected'])('fills approved logos while withholding %s identities and preserving existing logos/financials',(review)=>{
 const dir=mkdtempSync(path.join(tmpdir(),'logo-fill-'));
 const bytes=Buffer.from('fixture'),asset=iconHash(bytes),logo=`/api/value/logo?asset=${asset}`;
 const write=(f:string,d:unknown)=>{const p=path.join(dir,f);mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(d));};
 try{
  vi.stubEnv('VALUE_CORPUS_DIR',dir);
  for(const id of ['NEW.US','OLD.US','PENDING.US'])write(`enrichment-v7/logos/${id}.json`,{asset,logo,validated:true,validationVersion:2,identityReview:id==='PENDING.US'?review:'approved'});
  write(`enrichment-v7/logos/assets/${asset}.json`,{data:bytes.toString('base64')});
  const files:Record<string,any>={'index/US.json':[{id:'NEW.US',lg:null,v:42},{id:'OLD.US',lg:'baseline',v:9},{id:'PENDING.US',lg:null}], 'history/companies.json':[{id:'NEW.US',lg:null}], 'dossiers/001.json':{'NEW.US':{company:{id:'NEW.US',logo:null},valuation:{value:42}}}};
  fillPublishedLogos(files);
  expect(files['index/US.json']).toEqual([{id:'NEW.US',lg:logo,v:42},{id:'OLD.US',lg:'baseline',v:9},{id:'PENDING.US',lg:null}]);
  expect(files['history/companies.json'][0].lg).toBe(logo);
  expect(files['dossiers/001.json']['NEW.US']).toEqual({company:{id:'NEW.US',logo},valuation:{value:42}});
  expect(files[`logos/${asset}.json`].data).toBe(bytes.toString('base64'));
 }finally{vi.unstubAllEnvs();rmSync(dir,{recursive:true,force:true});}
});
