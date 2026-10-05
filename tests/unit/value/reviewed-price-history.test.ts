import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {readPriceHistory} from '@/lib/value/price-history';
import {writeCorpusJson} from '@/lib/value/corpus';
import {shardOf} from '@/lib/value/shard';
import type {PriceHistory} from '@/lib/value/types';
let root:string;
const id='SPLIT.US';
const previous:PriceHistory=[['2017-01',32],['2017-02',34],['2017-03',36],['2026-06',90],['2026-07',95],['2026-08',98],['2026-09',100]];
const raw:PriceHistory=previous.map(([m,p])=>[m,m<'2018'?p*1.953125:p]);
function seed(prices:PriceHistory){writeCorpusJson(`prices-history/${id}.json`,prices);writeCorpusJson(`publish-repo/dossiers/${shardOf(id)}.json`,{[id]:{id,priceHistory:previous}});}
beforeEach(()=>{root=mkdtempSync(join(tmpdir(),'reviewed-history-'));vi.stubEnv('VALUE_CORPUS_DIR',root);});
afterEach(()=>{vi.unstubAllEnvs();rmSync(root,{recursive:true,force:true});});
it('ordinary cache reads cannot replace released split-adjusted months with raw vendor closes',()=>{
 seed(raw);expect(readPriceHistory(id)).toEqual(previous);
});
it('retains the reviewed basis while accepting a new month and a current-month move',()=>{
 seed([...raw.slice(0,-1),['2026-09',102],['2026-10',103]]);
 expect(readPriceHistory(id)).toEqual([...previous.slice(0,-1),['2026-09',102],['2026-10',103]]);
});
it('does not invent adjusted older months from the conflicting source or churn retained values for vendor rounding',()=>{
 seed([['2016-12',60],...raw.map(([m,p]):[string,number]=>[m,m>='2026'?p+0.0000001:p])]);
 expect(readPriceHistory(id)).toEqual(previous);
});
it('accepts a uniformly rebased history after a new split, including its recent closed months',()=>{
 const adjusted:PriceHistory=previous.map(([m,p])=>[m,p/2]);seed(adjusted);
 expect(readPriceHistory(id)).toEqual(adjusted);
});
it('allows an isolated provider correction and fresh history without a released baseline',()=>{
 seed(previous.map(([m,p])=>[m,m==='2017-01'?33:p]));
 expect(readPriceHistory(id)?.[0]).toEqual(['2017-01',33]);
 writeCorpusJson(`prices-history/NEW.US.json`,raw);expect(readPriceHistory('NEW.US')).toEqual(raw);
});
it('fetching raw EOD history seeks a compatible Yahoo series before replacing reviewed prices',async()=>{
 const {fetchPriceHistory}=await import('@/lib/value/price-history');
 seed(raw);vi.stubEnv('EODHD_API_KEY','fixture');
 const requests:string[]=[];
 vi.stubGlobal('fetch',async(url:string)=>{
  const host=new URL(url).hostname;requests.push(host);
  if(host==='eodhd.com')return Response.json(raw.map(([m,p])=>({date:m+'-01',close:p})));
  return Response.json({chart:{result:[{meta:{gmtoffset:0},timestamp:previous.map(([m])=>Date.parse(m+'-01')/1000),indicators:{quote:[{close:previous.map(([,p])=>p)}]}}]}});
 });
 const company={id,code:'SPLIT',exchange:'US',source:'eodhd'} as any;
 try{expect(await fetchPriceHistory({company,from:'2016-01-01'})).toEqual(previous);expect(requests).toEqual(['eodhd.com','query1.finance.yahoo.com']);}
 finally{vi.unstubAllGlobals();}
});
it('rejects a second source that also conflicts rather than installing another unreviewed basis',async()=>{
 const {fetchPriceHistory}=await import('@/lib/value/price-history');seed(raw);
 vi.stubGlobal('fetch',async()=>Response.json({chart:{result:[{meta:{gmtoffset:0},timestamp:raw.map(([m])=>Date.parse(m+'-01')/1000),indicators:{quote:[{close:raw.map(([,p])=>p)}]}}]}}));
 try{await expect(fetchPriceHistory({company:{id,code:'SPLIT',exchange:'US'} as any,from:'2016-01-01',useYahoo:true})).rejects.toThrow('conflicts with the released share basis');}
 finally{vi.unstubAllGlobals();}
});
