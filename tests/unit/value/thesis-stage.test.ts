import { ResearchBudgetError } from '@/lib/value/budget';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readCorpusJson, writeCorpusJson } from '@/lib/value/corpus';
const mocks=vi.hoisted(()=>({selected:[] as any[],callsPerReading:1,ask:vi.fn(),sources:vi.fn()}));
vi.mock('@/lib/value/thesis/select',()=>({selectThesisCandidates:()=>mocks.selected}));
vi.mock('@/lib/value/jev/client',()=>({askJev:mocks.ask}));
vi.mock('@/lib/value/thesis/sources',()=>({diskGuard:()=>{},companySources:mocks.sources}));
vi.mock('@/lib/value/thesis/evidence',()=>({readThesis:async (_sources:unknown,_date:unknown,_context:unknown,ask:any)=>{for(let i=0;i<mocks.callsPerReading;i++)await ask({state:'filing',questions:{}});return {answers:[],recordings:[]};}}));
import thesis from '@/scripts/value/stages/thesis';
let root:string;
const candidate=(id:string,triggers=['buy'])=>({company:{id,name:id},analysis:{id,asOf:'2026-10-01'},fundamentals:null,triggers,drawdown:null,market:{currency:'USD',marketValue:100,ownerEarnings:10,asOf:'2026-10-01'}});
beforeEach(()=>{root=mkdtempSync(path.join(os.tmpdir(),'value-thesis-test-'));vi.stubEnv('VALUE_CORPUS_DIR',root);mocks.selected=[candidate('TEST.US')];mocks.callsPerReading=1;mocks.ask.mockReset().mockResolvedValue({answers:{}});mocks.sources.mockReset().mockResolvedValue({sources:[],gaps:[]});});
afterEach(()=>{vi.unstubAllEnvs();rmSync(root,{recursive:true,force:true});});
it('makes no provider calls for unchanged inputs, refreshes changed inputs and 31-day-old results',async()=>{
 await thesis({});expect(mocks.ask).toHaveBeenCalledTimes(1);
 await thesis({});expect(mocks.ask).toHaveBeenCalledTimes(1);expect(mocks.sources).toHaveBeenCalledTimes(1);
 mocks.selected[0].analysis.asOf='2026-10-02';
 await thesis({});expect(mocks.ask).toHaveBeenCalledTimes(1);
 mocks.selected[0].market.marketValue=110;
 await thesis({});expect(mocks.ask).toHaveBeenCalledTimes(2);
 const result:any=readCorpusJson('thesis/TEST.US.json');result.asOf=new Date(Date.now()-31*86400000).toISOString().slice(0,10);writeCorpusJson('thesis/TEST.US.json',result);
 await thesis({});expect(mocks.ask).toHaveBeenCalledTimes(3);
});
it('filters cached and out-of-scope companies before applying the company limit',async()=>{
 await thesis({});mocks.ask.mockClear();
 mocks.selected.push(candidate('NEXT.US',['next_closest']),candidate('RISK.US',['financial_charges']));
 await thesis({limit:1});
 expect(mocks.ask).toHaveBeenCalledTimes(1);
 expect(readCorpusJson('thesis/NEXT.US.json')).not.toBeNull();expect(readCorpusJson('thesis/RISK.US.json')).toBeNull();
});
it('caps default work at twelve companies and reports the actual call count',async()=>{
 mocks.selected=Array.from({length:15},(_,i)=>candidate(`C${i}.US`));const log=vi.spyOn(console,'log');
 await thesis({});expect(mocks.ask).toHaveBeenCalledTimes(12);
 expect(log).toHaveBeenCalledWith('thesis: Jev calls=12/240; selected=12');log.mockRestore();
});

it('stops at the Jev call budget without saving a partial thesis',async()=>{
 mocks.callsPerReading=241;
 await expect(thesis({})).rejects.toBeInstanceOf(ResearchBudgetError);
 expect(mocks.ask).toHaveBeenCalledTimes(240);
 expect(readCorpusJson('thesis/TEST.US.json')).toBeNull();
});
