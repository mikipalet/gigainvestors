import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {it,expect} from 'vitest';
import sharp from 'sharp';
import {iconHash} from '@/lib/value/logo-validation';
import {installLogoBundle} from '@/scripts/value/install-logos';
it('preflights hashes, preserves approved live records, and supports read-only dry runs',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'logo-install-')),source=path.join(root,'source'),target=path.join(root,'target');
 const put=(base:string,file:string,data:unknown)=>{const dest=path.join(base,file);mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,JSON.stringify(data));};
 try{
  const bytes=await sharp({create:{width:128,height:128,channels:4,background:'#336699'}}).webp().toBuffer(),asset=iconHash(bytes);
  const record={logo:`/api/value/logo?asset=${asset}`,asset,validated:true,validationVersion:2,identityReview:'approved'};
  put(source,'records/NEW.US.json',record);put(source,'records/OLD.US.json',record);put(source,`assets/${asset}.json`,{data:bytes.toString('base64')});
  put(source,'manifest.json',{entries:['NEW.US','OLD.US'].map(id=>({id,recordHash:iconHash(readFileSync(path.join(source,`records/${id}.json`)))}))});
  put(target,'enrichment-v7/logos/OLD.US.json',{logo:'existing-approved'});
  const dry=await installLogoBundle(source,target,{apply:false});expect(dry.installed).toBe(1);expect(dry.preserved).toBe(1);expect(existsSync(path.join(target,'enrichment-v7/logos/NEW.US.json'))).toBe(false);
  await installLogoBundle(source,target,{apply:true});expect(JSON.parse(readFileSync(path.join(target,'enrichment-v7/logos/NEW.US.json'),'utf8')).logo).toBe(record.logo);expect(JSON.parse(readFileSync(path.join(target,'enrichment-v7/logos/OLD.US.json'),'utf8')).logo).toBe('existing-approved');
  put(source,`assets/${asset}.json`,{data:Buffer.from('wrong').toString('base64')});
  await expect(installLogoBundle(source,target,{apply:false})).rejects.toThrow(/hash/i);
 }finally{rmSync(root,{recursive:true,force:true});}
});
