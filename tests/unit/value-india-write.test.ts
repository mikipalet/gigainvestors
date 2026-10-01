import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterEach, expect, it, vi } from 'vitest';
import { importIndia } from '../../lib/value/india/importer';

const roots:string[]=[];
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
it('writes only the selected canonical India fundamentals and its single cache; analysis and other issuers remain byte-identical',async()=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'india-fixture-'));roots.push(root);vi.stubEnv('VALUE_CORPUS_DIR',root);
  const put=(name:string,data:unknown)=>{const file=path.join(root,name);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,typeof data==='string'?data:JSON.stringify(data));};
  const company={id:'TCS.NSE',code:'TCS',exchange:'NSE',currency:'INR',source:'eodhd',country:'IN',indexes:['Nifty 50']};
  put('universe.jsonl',JSON.stringify(company)+'\n'+JSON.stringify({...company,id:'AAPL.US',code:'AAPL',exchange:'US',indexes:[]})+'\n');
  put('fundamentals/AAPL.US.json',{sentinel:'unrelated'});put('analysis/TCS.NSE.json',{sentinel:'analysis owner'});
  const rows=JSON.parse(readFileSync('tests/fixtures/value/india/TCS-annual.json','utf8'));
  const f=rows.find((r:any)=>r.consolidated==='Consolidated');
  put('raw/india/TCS-annual.json',[f]);
  put('raw/india/'+path.basename(f.xbrl),gunzipSync(readFileSync('tests/fixtures/value/india/TCS-2024.xml.gz')).toString());
  put('raw/india/TCS-integrated-1.json',{data:[],totalCount:0});
  put('raw/india/TCS-yahoo.json',{timeseries:{result:[]}});
  put('raw/india/TCS-splits.json',{chart:{result:[{meta:{symbol:'TCS.NS'},events:{}}]}});
  vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('Offline fixture must not use network');}));
  const result=await importIndia({only:['TCS.NSE']});
  expect(result[0].written).toBe(true);
  const fundamentals=JSON.parse(readFileSync(path.join(root,'fundamentals/TCS.NSE.json'),'utf8'));
  expect(fundamentals.years[0].revenue).toBe(2408930000000);
  expect(fundamentals.integrity.ok).toBe(false); // unchanged seven-year gate
  expect(readFileSync(path.join(root,'analysis/TCS.NSE.json'),'utf8')).toBe('{"sentinel":"analysis owner"}');
  expect(readFileSync(path.join(root,'fundamentals/AAPL.US.json'),'utf8')).toBe('{"sentinel":"unrelated"}');
  expect(readdirSync(path.join(root,'raw'))).toEqual(['india']);
  expect(readdirSync(root).sort()).toEqual(['analysis','fundamentals','raw','universe.jsonl']);
});
