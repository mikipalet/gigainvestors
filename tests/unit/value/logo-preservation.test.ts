import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import logos from '@/scripts/value/stages/logos';

let dir:string;
const file='enrichment-v7/logos/NTES.US.json';
const approved={logo:'/api/value/logo?asset='+'a'.repeat(64),asset:'a'.repeat(64),validated:true,validationVersion:2,identityReview:'passed',source:'wikidata-p154',matcherVersion:1,verifiedAt:'2026-10-05T08:00:00Z',attempts:[]};
function put(file:string,data:unknown){const dest=path.join(dir,file);mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,JSON.stringify(data)+'\n');}
beforeEach(()=>{
 dir=mkdtempSync(path.join(tmpdir(),'logo-preservation-'));vi.stubEnv('VALUE_CORPUS_DIR',dir);
 put('universe.jsonl',{id:'NTES.US',name:'NetEase',code:'NTES',exchange:'US',country:'US',listings:['NTES.US'],indexes:['SP500']});
 // Real discovery/validation with deterministic external image bytes.
 put('logo-manual/manual.json',{'NTES.US':{url:'https://example.com/logo.png',source:'Reviewed header'}});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:404})));
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();rmSync(dir,{recursive:true,force:true});});

it.each([
 ['approved old matcher',approved,{}],
 ['approved old validator',{...approved,validationVersion:1},{}],
 ['approved current record',{...approved,source:'manual',matcherVersion:2,identityReview:'approved'},{}],
 ['approved forced retry',approved,{only:['NTES.US'],force:true}],
 ['validated legacy record',{logo:'https://eodhd.com/img/logos/US/Ntes.png',source:'eodhd',validated:true,verifiedAt:'2026-09-30T13:46:07.923Z'},{}],
])('preserves %s byte-for-byte',async(_label,record,options)=>{
 put(file,record);const before=readFileSync(path.join(dir,file));
 await logos(options);
 expect(readFileSync(path.join(dir,file))).toEqual(before);
});

it('keeps a published logo without a cache record instead of shadowing it with a pending result',async()=>{
 put('publish-repo/index/US.json',[{id:'NTES.US',lg:'https://eodhd.com/img/logos/US/Ntes.png'}]);
 await logos();
 expect(existsSync(path.join(dir,file))).toBe(false);
});

it('does not alter an approval installed during discovery, even with the same verifiedAt',async()=>{
 put(file,{logo:null,validated:true,validationVersion:1,verifiedAt:approved.verifiedAt});
 const bytes=await sharp({create:{width:64,height:64,channels:4,background:'#245785'}}).png().toBuffer();
 vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>{
  if(String(url).includes('.invalid'))return new Response(null,{status:404});
  put(file,approved);
  return new Response(new Uint8Array(bytes),{headers:{'content-type':'image/png'}});
 }));
 await logos();
 expect(readFileSync(path.join(dir,file),'utf8')).toBe(JSON.stringify(approved)+'\n');
});

it('keeps an exactly restored uncached historical logo even while the current archive is demoted',async()=>{
 put('universe.jsonl',{id:'AAL.US',name:'American Airlines',code:'AAL',exchange:'US',country:'US',listings:['AAL.US'],indexes:['SP500']});
 put('publish-repo/index/US.json',[{id:'AAL.US',lg:null}]);
 await logos();
 expect(existsSync(path.join(dir,'enrichment-v7/logos/AAL.US.json'))).toBe(false);
});
