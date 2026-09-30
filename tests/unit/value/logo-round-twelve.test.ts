import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import logos from '@/scripts/value/stages/logos';
const temp=mkdtempSync(path.join(os.tmpdir(),'value-logo-12-'));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();rmSync(temp,{recursive:true,force:true});});
it('uses the ADR website chain for an ESEF issuer with no enrichment cache',async()=>{
 vi.stubEnv('VALUE_CORPUS_DIR',temp);
 const company={id:'RACE.MI',name:'Ferrari',code:'RACE',exchange:'MI',country:'IT',source:'esef',listings:['RACE.MI','RACE.US']};
 mkdirSync(path.join(temp,'raw/eodhd'),{recursive:true});
 writeFileSync(path.join(temp,'universe.jsonl'),JSON.stringify(company)+'\n');
 writeFileSync(path.join(temp,'raw/eodhd/RACE.US.json'),JSON.stringify({General:{WebURL:'https://www.ferrari.com'}}));
 // The existing favicon fallback needs no vendor image request.
 vi.stubGlobal('fetch',()=>{throw new Error('Unexpected network call');});
 await logos({only:['RACE.MI']});
 const result=JSON.parse(readFileSync(path.join(temp,'enrichment-v7/logos/RACE.MI.json'),'utf8'));
 expect(result.logo).toBe('https://icons.duckduckgo.com/ip3/www.ferrari.com.ico');
 expect(result.source).toBe('favicon');
});

it('uses the unauthenticated Yahoo assetProfile website and stops on an auth response',async()=>{
 const {issuerWebsite}=await import('@/lib/value/enrichment');
 const company={id:'TEST.MI',code:'TEST',exchange:'MI',country:'IT',listings:['TEST.MI']} as import('@/lib/value/types').Company;
 const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({quoteSummary:{result:[{assetProfile:{website:'https://issuer.example'}}]}})));
 expect(await issuerWebsite(company,request)).toBe('https://issuer.example');
 expect(request.mock.calls[0][0]).toContain('modules=assetProfile');
 request.mockClear();request.mockResolvedValue(new Response('{}',{status:401}));
 expect(await issuerWebsite(company,request)).toBeNull();expect(request).toHaveBeenCalledTimes(1);
});
