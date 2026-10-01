import {expect,it} from 'vitest';
import sharp from 'sharp';
import {validLogo,iconHash} from '@/lib/value/logo-validation';
import {wikidataWebsite} from '@/lib/value/wikidata-websites';
import type {Company} from '@/lib/value/types';
it('rejects undersized, corrupt and default images',async()=>{
 const png=await sharp({create:{width:64,height:64,channels:4,background:'#fff'}}).png().toBuffer();
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

it('accepts a decoded opaque header wordmark with a 64px long edge for paper padding',async()=>{
 const mark=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="214" height="24"><rect width="214" height="24" fill="white"/><text x="2" y="20" font-size="20" fill="red">Company</text></svg>')).removeAlpha().png().toBuffer();
 expect(await validLogo(mark,undefined,false,true)).toBe(true);
 expect(await validLogo(mark)).toBe(false);
});

it('accepts long vector issuer wordmarks for proportional square padding',async()=>{
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="760" height="46" viewBox="0 0 760 46"><text y="40" font-size="40">ISSUER GROUP</text></svg>');
 expect(await validLogo(svg)).toBe(true);
});
it('accepts the reviewed wide railway header dimensions without changing proportions',async()=>{
 const bytes=await sharp({create:{width:436,height:36,channels:4,background:'#336699'}}).png().toBuffer();
 expect(await validLogo(bytes,undefined,false,true)).toBe(true);
});
