import {expect,it} from 'vitest';
import {runNumericTests} from '@/lib/value/tests';
import {buildOutput} from '@/lib/value/build-output';
import {shardOf} from '@/lib/value/shard';
import {QUALITY_TESTS,type Analysis,type Dossier,type IndexRow,type StoreMeta} from '@/lib/value/types';
import {makeYears} from './synthetic';
import fixture from '../../fixtures/value/store/dossiers/073.json';

it('decides seven-year tests and retains accounting failures',()=>{
 const tests=runNumericTests({years:makeYears({n:7,overrides:{ocf:-10}}),kind:'operating'});
 for(const key of ['understandable','moat','economics','management'] as const){
  expect(tests[key].numeric,key).toBe('pass');
  expect(tests[key].insufficientHistory).toBeUndefined();
 }
 expect(tests.accounting.numeric).toBe('fail');
 expect(runNumericTests({years:makeYears({overrides:{ocf:-10}}),kind:'operating'}).accounting.numeric).toBe('fail');
});
it('republishing old short-history analyses corrects dossier, index and failure aggregates together',()=>{
 const analysis=structuredClone(Object.values(fixture)[0]) as unknown as Analysis;
 analysis.status='scored';analysis.historyCoverage={years:7,first:2019,last:2025,source:'esef'};
 for(const key of QUALITY_TESTS.filter(key=>key!=='price'))analysis.tests[key]={...analysis.tests[key],result:key==='accounting'?'pass':'fail',numeric:key==='accounting'?'pass':'fail'};
 const {files}=buildOutput({analyses:[analysis],holdersByTicker:{},investorNames:{},fx:{}});
 const row=(files[`index/${analysis.company.country}.json`] as IndexRow[])[0];
 expect(row.t).toBe('FFFFP');expect(row.b).toBe(false);
 const dossier=(files[`dossiers/${shardOf(analysis.id)}.json`] as Record<string,Dossier>)[analysis.id];
 expect(dossier.tests.understandable.result).toBe('fail');
 expect(dossier.tests.understandable.insufficientHistory).toBeUndefined();
 const gate=(files['meta.json'] as StoreMeta).funnel!.gates[0];
 expect(gate.fail).toBe(1);expect(gate.unclear).toBe(0);expect(gate.failsOnlyThis).toBe(0);
});

it('hides the about line when a dossier has no real description',async()=>{
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {DossierContent}=await import('@/components/value/DossierContent');
 const dossier=structuredClone(Object.values(fixture)[0]) as unknown as Dossier;
 dossier.company.about=null;dossier.company.description=null;dossier.company.sector='Consumer Cyclical';
 const html=renderToStaticMarkup(createElement(DossierContent,{dossier}));
 expect(html).not.toContain('A business in');expect(html).not.toContain('company-about');
});

it('does not turn unclear evidence into a failure in the company list',async()=>{
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {ResultsTable}=await import('@/app/value/_components/ResultsTable');
 const row={id:'RACE.MI',n:'Ferrari',t:'UUUUU',historyYears:6,mc:null,st:'s',k:'operating'} as IndexRow;
 const html=(r:IndexRow)=>renderToStaticMarkup(createElement(ResultsTable,{entries:[{row:r,mos:null,quote:null}],sort:'name',direction:1,sortBy:()=>{}}));
 expect(html(row)).toContain('Not enough history yet');expect(html(row)).not.toContain('Fails quality');
 expect(html({...row,historyYears:10})).not.toContain('Quality evidence incomplete');
 expect(html({...row,t:'UUUUF'})).toContain('Fails quality');
});

it('renders seven-year evidence without a history gap',async()=>{
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {TestSection}=await import('@/components/value/TestSection');
 const numeric=runNumericTests({years:makeYears({n:7}),kind:'operating'}).understandable;
 const html=renderToStaticMarkup(createElement(TestSection,{test:{...numeric,result:numeric.numeric,jev:[]}}));
 expect(html).not.toContain('Not tested');
 expect(html).not.toMatch(/aria-label="[^"]+: fail"/);
});
