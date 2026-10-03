import { expect, it, vi } from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeCorpusJson} from '@/lib/value/corpus';
import type {Company} from '@/lib/value/types';
import { valueCompany } from '@/lib/value/valuation';
import { makeYears } from './synthetic';

it('values a missing tagged share count using verified current shares without inventing annual shares', () => {
  const years = makeYears({overrides:{dilutedShares:null,basicEps:null}});
  const result = valueCompany({years,kind:'operating',currency:'EUR',bondYield:.03,cyclical:false,
    currentShares:10,reportedShares:true,shareSource:'yahoo-shares'});
  expect(result.valuation?.shares).toBe(10);
  expect(result.valuation?.sharesSource).toBe('yahoo-shares');
  expect(years.every(y=>y.dilutedShares===null)).toBe(true);
  expect(valueCompany({years,kind:'operating',currency:'EUR',bondYield:.03,cyclical:false}).reason).toBe('no share count');
});

it('accepts verified Yahoo shares only when the existing cap/price share-basis sanity check passes', async () => {
  const { verifiedEsefShares } = await import('@/lib/value/italy/shares');
  const good = {price:20,shares:100,currency:'EUR',source:'Yahoo chart × verified shares'};
  expect(verifiedEsefShares(good,2340,1.17)).toMatchObject({currentShares:100,shareSource:'yahoo-shares'});
  expect(verifiedEsefShares({...good,shares:10},2340,1.17).currentShares).toBeNull();
  expect(verifiedEsefShares({...good,shares:null},2340,1.17).currentShares).toBeNull();
  expect(verifiedEsefShares(good,null,1.17).currentShares).toBeNull();
});

it('reuses dated ESEF share observations in cache-only replays without overwriting their observation date', async () => {
  const root=mkdtempSync(path.join(os.tmpdir(),'esef-replay-'));
  vi.stubEnv('VALUE_CORPUS_DIR',root);vi.stubEnv('VALUE_NO_EODHD','1');
  const network=vi.fn(()=>{throw new Error('Offline');});vi.stubGlobal('fetch',network);
  try {
    const {esefShareInputs}=await import('@/lib/value/italy/shares');
    writeCorpusJson('raw/esef/shares/TEST.MI.json',{date:'2026-09-01',data:{price:20,shares:100,currency:'EUR',source:'Yahoo chart × verified shares'}});
    const file=path.join(root,'raw/esef/shares/TEST.MI.json'),before=readFileSync(file,'utf8');
    const company={id:'TEST.MI',code:'TEST',exchange:'MI',currency:'EUR',marketCapUsd:2340,listings:[]} as unknown as Company;
    expect(await esefShareInputs(company,async()=>1.17)).toMatchObject({currentShares:100,shareSource:'yahoo-shares'});
    expect(readFileSync(file,'utf8')).toBe(before);
    expect(network).not.toHaveBeenCalled();
    expect(await esefShareInputs({...company,id:'MISSING.MI'},async()=>1.17)).toMatchObject({currentShares:null});
    expect(network).not.toHaveBeenCalled();
  } finally {vi.unstubAllGlobals();vi.unstubAllEnvs();rmSync(root,{recursive:true,force:true});}
});
