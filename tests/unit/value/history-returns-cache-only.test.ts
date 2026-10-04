import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeCorpusJson} from '@/lib/value/corpus';
import historyReturns from '@/scripts/value/stages/history-returns';
import {latestHistoryFiles} from '@/scripts/value/stages/history-snapshots';

let root:string;
beforeEach(()=>{
 root=mkdtempSync(path.join(os.tmpdir(),'history-returns-cache-only-'));
 vi.stubEnv('VALUE_CORPUS_DIR',root);
 vi.stubEnv('VALUE_NO_EODHD','1');
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Network forbidden')));
 writeCorpusJson('history-v7/run/index.json',{scope:'universe',years:[],quarters:['2018Q3'],perYear:{},perQuarter:{}});
 writeCorpusJson('history-v7/run/2018Q3.json',[['OLD.US','PPPPP',.8,true,99]]);
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();rmSync(root,{recursive:true,force:true});});

it.each([false,true])('retains a dated cached return without network or freshness changes (force=%s)',async force=>{
 writeCorpusJson('history-return-prices/OLD.US.json',{currency:'USD',fetchedAt:'2026-10-03',prices:[['2018-09',10]],latest:[20,'2026-10-02']});
 const file=path.join(root,'history-return-prices/OLD.US.json'),before=readFileSync(file,'utf8');
 const result=await historyReturns({force});
 expect(result).toEqual({written:0,cached:1,failed:[]});
 expect(fetch).not.toHaveBeenCalled();
 expect(readFileSync(file,'utf8')).toBe(before);
 expect(latestHistoryFiles()['history/2018Q3.json']).toEqual([['OLD.US','PPPPP',.8,true,1,,,,{date:'2026-10-02'}]]);
});

it('reports missing return caches without attempting any provider',async()=>{
 const result=await historyReturns({});
 expect(result).toMatchObject({written:0,cached:0,failed:[{id:'OLD.US'}]});
 expect(fetch).not.toHaveBeenCalled();
 expect(existsSync(path.join(root,'history-return-prices/OLD.US.json'))).toBe(false);
});
