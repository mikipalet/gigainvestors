import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {it,expect,vi} from 'vitest';
import logos from '@/scripts/value/stages/logos';
it('fetches an unpublished in-scope company and resumes approved assets without network',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'new-logo-'));
 const put=(file:string,data:unknown)=>{const dest=path.join(dir,file);mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,JSON.stringify(data));};
 try{
  vi.stubEnv('VALUE_CORPUS_DIR',dir);
  const company={id:'NEW.US',name:'New Company',code:'NEW',exchange:'US',country:'US',listings:['NEW.US'],indexes:['SP500']};
  writeFileSync(path.join(dir,'universe.jsonl'),JSON.stringify(company)+'\n');
  put('publish-repo/index/US.json',[{id:'OLD.US',n:'Old',lg:'existing'}]);
  put('logo-manual/manual.json',{'NEW.US':{url:'https://new.example/logo.png',source:'Reviewed official header'}});
  const bytes=await sharp({create:{width:64,height:64,channels:4,background:'#245785'}}).png().toBuffer();
  const fetcher=vi.fn(async(url:unknown)=>String(url).includes('.invalid')?new Response(null,{status:404}):new Response(new Uint8Array(bytes),{headers:{'content-type':'image/png'}}));vi.stubGlobal('fetch',fetcher);
  await logos();
  expect(JSON.parse(readFileSync(path.join(dir,'enrichment-v7/logos/NEW.US.json'),'utf8')).logo).toMatch(/asset=/);
  fetcher.mockClear();await logos();expect(fetcher).not.toHaveBeenCalled();
 }finally{vi.unstubAllEnvs();vi.unstubAllGlobals();rmSync(dir,{recursive:true,force:true});}
},20000);
