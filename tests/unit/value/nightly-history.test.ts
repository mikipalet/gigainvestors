import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeCorpusJson,appendJsonl} from '@/lib/value/corpus';
import type {Company,IndexRow} from '@/lib/value/types';
import {latestHistoryFiles} from '@/scripts/value/stages/history-snapshots';
let root:string;
beforeEach(()=>{root=mkdtempSync(path.join(os.tmpdir(),'nightly-history-'));vi.stubEnv('VALUE_CORPUS_DIR',root);});
afterEach(()=>{vi.unstubAllEnvs();rmSync(root,{recursive:true,force:true});});
it('never replaces complete quarterly history with a later annual-only run',()=>{
 writeCorpusJson('history-v7/20261001/index.json',{scope:'universe',years:[2025],quarters:['2025Q4'],perYear:{},perQuarter:{}});
 writeCorpusJson('history-v7/20261001/2025Q4.json',[]);
 writeCorpusJson('history-v7/20261002/index.json',{scope:'universe',years:[2025],perYear:{}});
 writeCorpusJson('history-v7/20261002/2025.json',[]);
 expect(latestHistoryFiles([])['history/index.json']).toMatchObject({quarters:['2025Q4']});
});
it('does not erase enriched historical metadata with a null current-universe overlay',()=>{
 const c:Company={id:'OLD.US',code:'OLD',name:'Old Company',exchange:'US',country:'US',currency:'USD',kind:'operating',marketCapUsd:null,listings:['OLD.US'],indexes:[],isin:null,cik:null,lei:null,edinetCode:null,sector:null,industry:null,description:null,source:'eodhd'};
 appendJsonl('universe.jsonl',c);
 writeCorpusJson('companies/OLD.US.json',{...c,marketCapUsd:100});
 writeCorpusJson('history-v7/run/index.json',{scope:'universe',years:[],quarters:['2018Q3'],perYear:{},perQuarter:{}});
 writeCorpusJson('history-v7/run/2018Q3.json',[[c.id,'PPPPP',.8,true,99]]);
 const files=latestHistoryFiles([c]);
 expect((files['history/companies.json'] as IndexRow[])[0].mc).toBe(100);
});

it('recomputes both market summaries from fresh outcomes without changing predictions',()=>{
 const company=(id:string,country:string)=>({id,code:id.split('.')[0],exchange:id.split('.')[1],name:id,country,currency:country==='US'?'USD':'JPY',listings:[id],indexes:[],kind:'operating',marketCapUsd:null});
 const us=company('OLD.US','US'),jp=company('TEST.JP','JP');
 writeCorpusJson('history-v7/run/index.json',{scope:'universe',years:[],quarters:['2018Q3'],perYear:{},perQuarter:{}});
 writeCorpusJson('history-v7/run/2018Q3.json',[[us.id,'PPPPP',.8,true,99],[jp.id,'FFFFF',2,false,99]]);
 for(const [id,latest]of [[us.id,20],[jp.id,5]] as const)writeCorpusJson(`history-return-prices/${id}.json`,{currency:'USD',fetchedAt:'2026-10-03',prices:[['2018-09',10]],latest:[latest,'2026-10-02']});
 const files=latestHistoryFiles([us,jp] as any);
 expect(files['history/index.json']).toMatchObject({perQuarter:{'2018Q3':{analysed:2,avgReturnAtBuy:1,avgReturnAll:.25}},western:{perQuarter:{'2018Q3':{analysed:1,avgReturnAll:1}}}});
 expect((files['history/2018Q3.json'] as any[]).map(r=>r.slice(0,4))).toEqual([[us.id,'PPPPP',.8,true],[jp.id,'FFFFF',2,false]]);
});

it('retains empty released periods and their history index even when no rows are missing',async()=>{
 const {retainPublishedHistory}=await import('@/scripts/value/retain-published-history');
 writeCorpusJson('previous/history/index.json',{years:[2018],quarters:['2018Q3'],perYear:{2018:{analysed:0}},perQuarter:{'2018Q3':{analysed:0}}});
 writeCorpusJson('previous/history/2018.json',[]);writeCorpusJson('previous/history/2018Q3.json',[]);
 const files:Record<string,unknown>={};retainPublishedHistory(files,path.join(root,'previous'));
 expect(files['history/2018Q3.json']).toEqual([]);
 expect(files['history/index.json']).toMatchObject({years:[2018],quarters:['2018Q3']});
});
it('retains an archived identity when its historical row already exists in the new snapshot',async()=>{
 const {retainPublishedHistory}=await import('@/scripts/value/retain-published-history');
 const row=['OLD.US','PPPPP',.8,true,1],identity={id:'OLD.US',n:'Old Company',c:'US',cur:'USD'};
 writeCorpusJson('previous/history/index.json',{years:[2018],perYear:{}});
 writeCorpusJson('previous/history/2018.json',[row]);
 writeCorpusJson('previous/history/companies.json',[identity]);
 const files:Record<string,unknown>={'history/2018.json':[row],'history/companies.json':[]};
 expect(retainPublishedHistory(files,path.join(root,'previous'))).toEqual([]);
 expect(files['history/companies.json']).toEqual([identity]);
});
