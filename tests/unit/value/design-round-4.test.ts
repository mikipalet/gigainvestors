import { expect, it } from 'vitest';
import { marketCapCurrency } from '@/lib/value/currency';
import { valuationFlags } from '@/lib/value/data-quality';
import { perShareMoney } from '@/lib/value/metric-labels';
it('converts provider aggregate caps in major units exactly once',()=>{
 expect(marketCapCurrency('GBX')).toBe('GBP');
 expect(marketCapCurrency('ZAc')).toBe('ZAR');
 expect(marketCapCurrency('ILA')).toBe('ILS');
 expect(marketCapCurrency('GBP')).toBe('GBP');
});
it('holds unverified ratios and corrected share counts below clean rows',()=>{
 expect(valuationFlags({price:7,mid:100,assumptions:[]})).toContain('Unverified ratio: price / value is outside 0.2×–20×');
 expect(valuationFlags({price:70,mid:100,assumptions:['share count corrected to current']})).toContain('share count corrected to current');
 expect(valuationFlags({price:70,mid:100,assumptions:[]})).toEqual([]);
});
it('formats pence with separators and without false decimal precision',()=>expect(perShareMoney(12492,'GBX')).toBe('12,492p'));

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withEnglishName } from '@/lib/value/companies';
import type { Company } from '@/lib/value/types';
it('uses an English name from a linked issuer listing and preserves the native name',()=>{
 const dir=mkdtempSync(join(tmpdir(),'value-name-'));const previous=process.env.VALUE_CORPUS_DIR;
 try{
  process.env.VALUE_CORPUS_DIR=dir;mkdirSync(join(dir,'raw/eodhd'),{recursive:true});
  writeFileSync(join(dir,'raw/eodhd/TM.US.json'),JSON.stringify({General:{Name:'Toyota Motor Corporation ADR'}}));
  const company={id:'7203.JP',name:'トヨタ自動車株式会社',listings:['7203.JP','TM.US']} as Company;
  expect(withEnglishName(company)).toMatchObject({name:'Toyota Motor Corporation',nativeName:company.name,id:'7203.JP'});
 }finally{if(previous===undefined)delete process.env.VALUE_CORPUS_DIR;else process.env.VALUE_CORPUS_DIR=previous;rmSync(dir,{recursive:true});}
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TestSection } from '@/components/value/TestSection';
import type { TestOutcome } from '@/lib/value/types';
it('explains a management pass supported by the recent five-year share count',()=>{
 const test={key:'management',result:'pass',numeric:'pass',metrics:{shareCagr:.153,shareCagr5:-.016},series:{},reasons:[],jev:[]} as TestOutcome;
 const html=renderToStaticMarkup(createElement(TestSection,{test,lastFiscalYear:2026}));
 expect(html).toContain('five-year dilution test passes: shares changed -1.6%');
 expect(html).toContain('FY2021–FY2026');
 expect(html).toContain('ten-year measure is 15.3%');
 test.metrics={};test.result='unclear';
 expect(renderToStaticMarkup(createElement(TestSection,{test,lastFiscalYear:2026}))).not.toContain('shares changed Not reported');
});
