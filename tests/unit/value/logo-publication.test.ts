import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {expect,it,vi} from 'vitest';
import {writeOutput} from '@/scripts/value/stages/publish';
import {GET} from '@/app/api/value/logo/route';
it('carries a logo asset through the local output writer into the same-origin proxy',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'value-logo-publish-'));
 try{
  const bytes=await sharp({create:{width:64,height:64,channels:4,background:'#13579b'}}).webp().toBuffer();
  const hash=createHash('sha256').update(bytes).digest('hex');
  writeOutput({repo:dir,files:{[`logos/${hash}.json`]:{data:bytes.toString('base64')}}});
  vi.stubEnv('VALUE_STORE_DIR',dir);
  const r=await GET(new Request(`https://value.example/api/value/logo?asset=${hash}`));
  expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('immutable');
  expect(Buffer.from(await r.arrayBuffer())).toEqual(bytes);
  expect(()=>writeOutput({repo:dir,files:{'logos/../../bad.json':{}}})).toThrow('Invalid publish output path');
 }finally{vi.unstubAllEnvs();rmSync(dir,{recursive:true,force:true});}
});
