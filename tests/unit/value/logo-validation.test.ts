import {expect,it} from 'vitest';
import sharp from 'sharp';
import {validLogo,iconHash} from '@/lib/value/logo-validation';
import {wikidataWebsite} from '@/lib/value/wikidata-websites';
import type {Company} from '@/lib/value/types';
it('rejects undersized, corrupt and default images',async()=>{
 const png=await sharp({create:{width:32,height:32,channels:4,background:'#fff'}}).png().toBuffer();
 expect(await validLogo(png)).toBe(true);
 expect(await validLogo(png,iconHash(png))).toBe(false);
 expect(await validLogo(await sharp(png).resize(16,16).toBuffer())).toBe(false);
 expect(await validLogo(new Uint8Array([137,80,78,71,13,10,26,10]))).toBe(false);
});
it('matches ticker plus exchange, never a similarly named issuer',()=>{
 const c={code:'1234',exchange:'JP',country:'JP'} as Company;
 const rows=[{item:{value:'Q1'},ticker:{value:'1234'},exchange:{value:'http://www.wikidata.org/entity/Q217475'},website:{value:'https://issuer.example'}}];
 expect(wikidataWebsite(c,rows)).toBe('https://issuer.example');
 expect(wikidataWebsite({...c,exchange:'TW',country:'TW'},rows)).toBeNull();
 expect(wikidataWebsite(c,[...rows,{...rows[0],item:{value:'Q2'}}])).toBeNull();
});
