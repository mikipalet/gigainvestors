import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeCorpusJson} from '@/lib/value/corpus';
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
