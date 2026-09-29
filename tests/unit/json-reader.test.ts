import { expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readJsonFile } from '@/lib/blob';
it('keeps forgiving main-site reads and strict corpus reads distinct',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'value-json-'));
 try {
  const file=path.join(dir,'data.json');
  expect(readJsonFile(file,{missingOnly:true})).toBeNull();
  writeFileSync(file,'broken');
  expect(readJsonFile(file)).toBeNull();
  expect(()=>readJsonFile(file,{missingOnly:true})).toThrow();
  writeFileSync(file,'{"price":25}');
  expect(readJsonFile(file,{missingOnly:true})).toEqual({price:25});
 }finally{rmSync(dir,{recursive:true,force:true});}
});
