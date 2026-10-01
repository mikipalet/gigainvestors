import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {expect,it,vi} from 'vitest';
import {writeCorpusJson} from '@/lib/value/corpus';
import {reviewedReportLogo} from '@/lib/value/logo-report';

it('requires an approved, in-bounds crop of the exact report whose cover was rendered',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'logo-report-'));
 vi.stubEnv('VALUE_CORPUS_DIR',dir);
 try{
  const cover=path.join(dir,'cover.png');
  await sharp({create:{width:400,height:600,channels:3,background:'#c12345'}}).png().toFile(cover);
  writeCorpusJson('enrichment-v7/logos/report-covers/I.US.json',{url:'https://issuer.test/2025.pdf'});
  const crop={url:'https://issuer.test/2025.pdf',left:20,top:20,width:200,height:80,review:'Visually checked issuer mark'};
  expect(await reviewedReportLogo('I.US',cover,undefined)).toBeNull();
  expect(await reviewedReportLogo('I.US',cover,{...crop,review:''})).toBeNull();
  expect(await reviewedReportLogo('I.US',cover,{...crop,url:'https://issuer.test/2024.pdf'})).toBeNull();
  expect(await reviewedReportLogo('I.US',cover,{...crop,left:350})).toBeNull();
  expect(await sharp((await reviewedReportLogo('I.US',cover,crop))!).metadata()).toMatchObject({width:200,height:80});
 }finally{vi.unstubAllEnvs();rmSync(dir,{recursive:true,force:true});}
});
