import {it,expect,vi} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeCorpusJson} from '../../../lib/value/corpus';
import {parseEcbYield,bondObservation} from '../../../lib/value/bond-yields';
const csv=(country='IE',period='2026-08',value='3.35',unit='PC')=>`KEY,FREQ,REF_AREA,MATURITY_CAT,CURRENCY_TRANS,TIME_PERIOD,OBS_VALUE,UNIT,UNIT_MULT\nIRS.M.${country}.L.L40.CI.0000.EUR.N.Z,M,${country},CI,EUR,${period},${value},${unit},0`;
it('validates ECB country, ten-year tenor, percent units and monthly freshness',()=>{
 expect(parseEcbYield(csv(),'IE','2026-10-02')).toEqual({yield:.0335,observedAt:'2026-08-31'});
 expect(parseEcbYield(csv('DE'),'IE','2026-10-02')).toBeNull();
 expect(parseEcbYield(csv('IE','2026-01'),'IE','2026-10-02')).toBeNull();
 expect(parseEcbYield(csv('IE','2026-11'),'IE','2026-10-02')).toBeNull();
 expect(parseEcbYield(csv('IE','2026-08','335'),'IE','2026-10-02')).toBeNull();
 expect(parseEcbYield(csv('IE','2026-08','3.35','EUR'),'IE','2026-10-02')).toBeNull();
});
it('preserves a cached unavailable bond observation during a cache-only replay',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'bond-replay-'));
 vi.stubEnv('VALUE_CORPUS_DIR',root);vi.stubEnv('VALUE_NO_EODHD','1');
 const network=vi.fn(()=>{throw new Error('Offline');});vi.stubGlobal('fetch',network);
 try{
  writeCorpusJson('bonds/US.json',{version:3,date:'2026-09-01',yield:null,source:'unavailable',symbol:'US10Y.GBOND',observedAt:null,rawYield:null,median:null,secondSource:null,flags:['no-local-yield']});
  const file=path.join(root,'bonds/US.json'),before=readFileSync(file,'utf8');
  expect(await bondObservation('US')).toMatchObject({date:'2026-09-01',yield:null,flags:['no-local-yield']});
  expect(readFileSync(file,'utf8')).toBe(before);expect(network).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();vi.unstubAllEnvs();rmSync(root,{recursive:true,force:true});}
});
