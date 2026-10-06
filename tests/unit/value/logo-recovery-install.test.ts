import {it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {iconHash} from '@/lib/value/logo-validation';
import recovery from '@/lib/value/logo-restorations.json';
import {installRecoveryBundle} from '@/scripts/value/install-logo-recovery';

it('preflights a pinned recovery, restores exact legacy/absent records, preserves newer approvals and is repeatable',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'restore-install-')),source=path.join(root,'bundle'),target=path.join(root,'corpus');
 const put=(base:string,f:string,d:unknown)=>{const p=path.join(base,f);mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(d)+'\n');return iconHash(readFileSync(p));};
 try{
  const demoted={logo:null,identityReview:'pending',validated:true};const expected=iconHash(Buffer.from(JSON.stringify(demoted)+'\n'));
  const entries=['ALSN.US','AAL.US','AFYA.US'].map(id=>{const cache=(recovery.entries as any)[id].cache;const file=`records/${id}.json`;return {id,beforeHash:expected,recordHash:put(source,file,cache)};});
  const files=Object.fromEntries(entries.map(e=>[`records/${e.id}.json`,e.recordHash]));
  files['additions/manifest.json']=put(source,'additions/manifest.json',{entries:[]});
  const manifest={version:1,archive:recovery.archive,entries,files};const manifestHash=put(source,'manifest.json',manifest);
  for(const e of entries)put(target,`enrichment-v7/logos/${e.id}.json`,demoted);
  put(target,'enrichment-v7/logos/AFYA.US.json',{logo:'https://example.com/new-approved',validated:true});
  await installRecoveryBundle(source,target,{apply:false,manifestHash});expect(JSON.parse(readFileSync(path.join(target,'enrichment-v7/logos/ALSN.US.json'),'utf8'))).toEqual(demoted);
  put(source,'records/AAL.US.json',{logo:'invented'});
  await expect(installRecoveryBundle(source,target,{apply:true,manifestHash})).rejects.toThrow(/hash/i);
  expect(JSON.parse(readFileSync(path.join(target,'enrichment-v7/logos/ALSN.US.json'),'utf8'))).toEqual(demoted);
  put(source,'records/AAL.US.json',null);
  await installRecoveryBundle(source,target,{apply:true,manifestHash});
  expect(JSON.parse(readFileSync(path.join(target,'enrichment-v7/logos/ALSN.US.json'),'utf8'))).toEqual(recovery.entries['ALSN.US'].cache);
  expect(existsSync(path.join(target,'enrichment-v7/logos/AAL.US.json'))).toBe(false);
  expect(JSON.parse(readFileSync(path.join(target,'enrichment-v7/logos/AFYA.US.json'),'utf8')).logo).toContain('new-approved');
  expect((await installRecoveryBundle(source,target,{apply:true,manifestHash})).restored).toBe(0);
  put(target,'enrichment-v7/logos/ALSN.US.json',{logo:null,identityReview:'rejected'});
  await expect(installRecoveryBundle(source,target,{apply:true,manifestHash})).rejects.toThrow(/changed/i);
 }finally{rmSync(root,{recursive:true,force:true});}
});
