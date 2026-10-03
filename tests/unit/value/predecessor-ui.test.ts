import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {FilingEvidence} from '@/components/value/FilingEvidence';
import {primaryTileMetric,tileSentence} from '@/lib/value/tile-metric';
import type {Dossier,TestOutcome} from '@/lib/value/types';
import {humanVerdict} from '@/lib/value/judgement/apply';
it('does not turn an undecided predecessor-backed checklist into a negative business verdict',()=>{
 const dossier={predecessorHistory:[{fy:2019}],tests:Object.fromEntries(['understandable','moat','economics','management','accounting'].map(key=>[key,{result:key==='management'?'unclear':'pass'}]))} as Dossier;
 expect(humanVerdict(dossier,false,false)).toBe('Wait');
 dossier.tests.moat.result='fail';expect(humanVerdict(dossier,false,false)).toBe('Not a wonderful business');
});
it('keeps confirmed observations but omits gap sentences for an undecided test',()=>{
 const test:TestOutcome={key:'management',result:'unclear',numeric:'unclear',metrics:{},series:{perShareValue:[[2021,1],[2022,2]]},reasons:[],jev:[]};
 const metric=primaryTileMetric(test,'operating');
 expect(metric.series).toEqual([[2021,1],[2022,2]]);
 expect(tileSentence(test,metric,'operating')).toBe('');
});
it('places dated predecessor sources inside the existing filing evidence section',()=>{
 const basis={parent:'Sodexo',segment:'Benefits & Rewards Services',basis:'segment' as const,source:'https://example.com/segment',detail:'Historical segment'};
 const dossier={id:'PLX.PA',report:{url:null},predecessorHistory:[{fy:2019,...basis},{fy:2020,...basis}]} as Dossier;
 const html=renderToStaticMarkup(createElement(FilingEvidence,{dossier}));
 expect(html).toContain('FY2019–2020');expect(html).toContain('before the spin-off: Sodexo segment');
 expect(html.match(/<section/g)).toHaveLength(1);expect(html.match(/<h3/g)).toHaveLength(1);
 expect(html).toContain('href="https://example.com/segment"');
});
