import sharp from 'sharp';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { appendJsonl, writeCorpusJson, readCorpusJson } from '@/lib/value/corpus';
import { loadCompanies } from '@/lib/value/companies';
import logos from '@/scripts/value/stages/logos';
import enrich from '@/scripts/value/stages/enrich';
import history, { filingDates, latestHistoryFiles } from '@/scripts/value/stages/history-snapshots';
import { writeOutput } from '@/scripts/value/stages/publish';
import { makeYears } from './synthetic';
import type { Company, SnapshotRow } from '@/lib/value/types';
let dir:string;
const company: Company = {id:'TEST.US',name:'Test',code:'TEST',exchange:'US',country:'US',currency:'USD',isin:null,cik:null,lei:null,edinetCode:null,sector:null,industry:null,kind:'operating',listings:['TEST.US'],marketCapUsd:null,description:null,source:'eodhd'};
beforeEach(()=>{dir=mkdtempSync(path.join(os.tmpdir(),'value-data7-'));vi.stubEnv('VALUE_CORPUS_DIR',dir);vi.stubGlobal('fetch',()=>{throw new Error('offline stage');});});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();rmSync(dir,{recursive:true,force:true});});
function allFiles(root:string,prefix=''): Record<string,string> {
  return Object.fromEntries(readdirSync(path.join(root,prefix),{withFileTypes:true}).flatMap(f=>f.isDirectory()?Object.entries(allFiles(root,path.join(prefix,f.name))):[[path.join(prefix,f.name),readFileSync(path.join(root,prefix,f.name),'utf8')]]));
}
it('runs both stages without changing any preexisting corpus bytes and publishes history paths', async()=>{
  appendJsonl('universe.jsonl',company);
  writeCorpusJson('raw/eodhd/TEST.US.json',{General:{Name:'Test English Co Ltd',Description:'Test makes widgets. Another sentence.',WebURL:'https://test.example.com'},Financials:{Income_Statement:{yearly:{'2016-12-31':{filing_date:'2017-02-20'}}}}});
  writeCorpusJson('fundamentals/TEST.US.json',{id:company.id,currency:'USD',years:makeYears({from:2006,n:11}),integrity:{ok:true,reasons:[]},fetchedAt:'2026-09-29'});
  writeCorpusJson('prices-history/TEST.US.json',[['2017-03',50],['2017-12',50],['2026-08',100]]);
  writeCorpusJson('prices/US.json',{'TEST.US':[150,'2026-09-28']});
  writeCorpusJson('bonds.json',{US:{yield:.04}});
  for(let i=1;i<300;i++) {
    const id=`TEST${i}.US`;appendJsonl('universe.jsonl',{...company,id});
    for(const folder of ['fundamentals','raw/eodhd','prices-history'])writeCorpusJson(`${folder}/${id}.json`,readCorpusJson(`${folder}/TEST.US.json`));
    writeCorpusJson('prices/US.json',{...readCorpusJson<Record<string,unknown>>('prices/US.json'),[id]:[150,'2026-09-28']});
  }
  const before=allFiles(dir);
  expect((await enrich()).namesFixed).toBe(300);
  expect((await enrich()).namesFixed).toBe(300); // cached runs report the original baseline
  const first=await history();
  expect(first.index.quarters?.[0]).toBe('2005Q1');
  expect(first.index.quarters).toContain('2017Q1');
  expect(first.index.caveats).toEqual([
    'numbers-only checklist (no report reading)', 'buy requires both the margin of safety and expected return at least the required return', 'restated financials',
    'survivorship: delisted companies missing', 'price returns without dividends',
  ]);
  expect(first.index.perQuarter!['2017Q1']).toMatchObject({medianReturnAll:2, returnCountAll:300, hitRateAll:0});
  const rows=latestHistoryFiles()['history/2017Q1.json'] as SnapshotRow[];
  // Publication now requires the separately dated return-price cache. The
  // immutable research run above retains its gain; it must not leak as fresh.
  expect(rows[0][4]).toBeNull();
  expect(rows[0][8]).toBeUndefined();
  expect((latestHistoryFiles()['history/index.json'] as typeof first.index).perQuarter!['2017Q1'])
    .toMatchObject({medianReturnAll:null, returnCountAll:0, hitRateAll:null});
  const patched=loadCompanies({})[0];
  expect(patched).toMatchObject({name:'Test English Co Ltd',nameEn:'Test English Co Ltd',logo:null,about:'Test makes widgets.'});
  const second=await history(); expect(second.report.root).not.toBe(first.report.root);
  const after=allFiles(dir);
  for (const [file,bytes] of Object.entries(before)) expect(after[file],file).toBe(bytes);
  expect(Object.keys(after).filter(f=>!(f in before)).every(f=>/^(enrichment-v7|history-v7)\//.test(f))).toBe(true);
  const repo=path.join(dir,'output'),published=latestHistoryFiles(); writeOutput({repo,files:published});
  expect(JSON.parse(readFileSync(path.join(repo,'history/2017Q1.json'),'utf8'))).toEqual(rows);
  expect(JSON.parse(readFileSync(path.join(repo,'history/index.json'),'utf8'))).toEqual(published['history/index.json']);
  expect(second.index.perQuarter!['2017Q1']).toMatchObject({medianReturnAll:2, returnCountAll:300});
  expect(()=>writeOutput({repo,files:{'history/../meta.json':{}}})).toThrow('Invalid publish output path');
},60000);
it('uses annual filing dates by period and chooses the earliest valid filing',()=>{
  expect(filingDates({Financials:{Income_Statement:{yearly:{'2016-12-31':{filing_date:'2017-02-20'},'2015-12-31':{filing_date:'2015-01-01'}}}}},null,{'2016-12-31':'2017-03-01'})).toEqual({'2016-12-31':'2017-02-20'});
});

it('recovers a transient vendor-logo failure in new files without replacing existing enrichment',async()=>{
  appendJsonl('universe.jsonl',company);
  writeCorpusJson('raw/eodhd/TEST.US.json',{General:{LogoURL:'/img/logos/US/test.png'}});
  const patch={nameEn:'Test',nameSource:'eodhd',logo:'https://icons.duckduckgo.com/ip3/test.com.ico',logoSource:'favicon',about:null};
  writeCorpusJson('enrichment-v7/companies/TEST.US.json',patch);
  writeCorpusJson('enrichment-v7/wikidata/websites.json',[]);
  vi.stubGlobal('fetch',async(url:string)=>url.includes('wikidata')?Response.json({results:{bindings:[]}}):new Response(new Uint8Array(await sharp({create:{width:64,height:64,channels:4,background:url.includes('.invalid')?'#ffffff':'#112233'}}).png().toBuffer()),{status:200,headers:{'content-type':'image/png'}}));
  await logos({only:[company.id]});
  expect(readCorpusJson('enrichment-v7/companies/TEST.US.json')).toEqual(patch);
  expect(loadCompanies({})[0].logo).toBeNull();
  expect(readCorpusJson<{pendingLogo:string}>('enrichment-v7/logos/TEST.US.json')?.pendingLogo).toMatch(/^\/api\/value\/logo\?asset=[a-f0-9]{64}$/);
  expect(readCorpusJson<{sourceUrl:string}>('enrichment-v7/logos/TEST.US.json')?.sourceUrl).toBe('https://eodhd.com/img/logos/US/test.png');
});

it('never replaces full-universe history with an incomplete or selected-company run',async()=>{
  writeCorpusJson('history-v7/20260101/2016.json',[]);
  writeCorpusJson('history-v7/20260101/index.json',{years:[2016],perYear:{},scope:'universe'});
  writeCorpusJson('history-v7/20260102/2017.json',[]);
  writeCorpusJson('history-v7/20260103/2018.json',[]);
  writeCorpusJson('history-v7/20260103/index.json',{years:[2018],perYear:{},scope:'selection'});
  expect(Object.keys(latestHistoryFiles())).toEqual(['history/index.json','history/2016.json','history/companies.json']);
});

it('recovers an English first sentence into a new about cache without changing old enrichment',async()=>{
  appendJsonl('universe.jsonl',company);
  writeCorpusJson('raw/eodhd/TEST.US.json',{General:{Description:'Test makes widgets. 会社の詳細です。'}});
  const patch={nameEn:'Test',nameSource:'eodhd',logo:null,logoSource:null,about:null};
  writeCorpusJson('enrichment-v7/companies/TEST.US.json',patch);
  await enrich();
  expect(readCorpusJson('enrichment-v7/companies/TEST.US.json')).toEqual(patch);
  expect(loadCompanies({})[0].about).toBe('Test makes widgets.');
});
