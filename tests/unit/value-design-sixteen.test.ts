import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {FinancialHighlights,FilingSignals} from '@/components/value/DossierNumbers';
import {tileMetric,tileSentence} from '@/lib/value/tile-metric';
import {formatMetric,displayReturnText} from '@/lib/value/metric-labels';
import type {Dossier} from '@/lib/value/types';
const d:Dossier=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'];
it('caps extreme capital returns while preserving ordinary percentages and exact data',()=>{
 expect(formatMetric({value:13.25,format:'pct',returnRatio:true})).toBe('>100%');
 expect(formatMetric({value:1,format:'pct',returnRatio:true})).toBe('100.0%');
 expect(formatMetric({value:13.25,format:'pct'})).toBe('1325.0%');
});
it('shows a latest net cash snapshot without explaining absent history',()=>{
 const html=renderToStaticMarkup(createElement(FinancialHighlights,{dossier:{...d,series:{},valuation:{...d.valuation!,netDebt:-123000000}}}));
 expect(html).toContain('Net cash');expect(html).toContain('123M');expect(html).not.toMatch(/not supplied|latest balance sheet/i);
});
it('filing likelihoods omit absence and informational wording',()=>{
 const test={...d.tests.accounting,jev:[{q:'material_weakness',label:'Control weakness',kind:'noul' as const,value:'no',probability:.1,trusted:false,evidence:null,section:'auditor' as const}]};
 const html=renderToStaticMarkup(createElement(FilingSignals,{test}));
 expect(html).toContain('10%');expect(html).not.toMatch(/informational only|no .*supplied/i);
 const financial={...test,metrics:{financialRedFlags:0}};
 expect(tileSentence(financial,tileMetric(financial,'bank'),'bank')).toContain('0 accounting warnings were found (none allowed)');
});
it('financial management leads with book value per dollar retained',()=>{
 const test={...d.tests.management,metrics:{retainedBookRatio:2.33,shareCagrExCrisis:-.02}};
 expect(tileSentence(test,tileMetric(test,'bank'),'bank')).toContain('ordinary shares shrank 2% a year (growth limit 2%)');
});

it('caps named capital returns in drawer prose without changing other percentages',()=>{
 expect(displayReturnText('ROIC first 3 years vs last 3 years: 124.9% vs 583.6%')).toBe('ROIC first 3 years vs last 3 years: >100% vs >100%');
 expect(displayReturnText('Revenue grew 125%; ROE 143%')).toBe('Revenue grew 125%; ROE >100%');
});
