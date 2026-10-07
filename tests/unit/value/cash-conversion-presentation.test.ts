import {expect,it} from 'vitest';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {EvidencePanel} from '@/components/value/EvidencePanel';
import {TileNumbers} from '@/components/value/DossierNumbers';
import {tileMetric} from '@/lib/value/tile-metric';
import {yearTable} from '@/lib/value/drawer-data';
import type {Dossier,TestOutcome} from '@/lib/value/types';
// Unequal profits ensure a ratio of sums cannot be replaced by an annual median.
const t:TestOutcome={key:'economics',result:'fail',numeric:'fail',metrics:{oeToNi:455.1/610,ownerEarningsTotal:455.1,netIncomeTotal:610},reasons:['owner earnings cash conversion below threshold'],jev:[],series:{ownerEarnings:[[2021,80],[2022,58],[2023,70],[2024,77],[2025,170.1]],netIncome:[[2021,100],[2022,100],[2023,100],[2024,100],[2025,210]]}};
// The same observations yield .75 for totals, .77 median and .81 latest.
const d={id:'AUDIT.US',company:{kind:'operating',currency:'USD'},report:{},series:{},tests:{understandable:{series:{}},economics:t}}as unknown as Dossier;
it('identifies the deciding five-year totals separately from annual median/latest on both surfaces',()=>{
 const metric=tileMetric(t,'operating');
 for(const html of [renderToStaticMarkup(React.createElement(TileNumbers,{metric,test:t,currency:'USD'})),renderToStaticMarkup(React.createElement(EvidencePanel,{dossier:d,test:t}))]){
  expect(html).toMatch(/Five-year totals<\/dt><dd>0\.75/);
  expect(html).toMatch(/Annual median<\/dt><dd>0\.77/);
  expect(html).toContain('Latest · 2025');expect(html).toContain('0.81');
 }
 const drawer=renderToStaticMarkup(React.createElement(EvidencePanel,{dossier:d,test:t}));
 expect(drawer).toContain('Five-year totals: owner cash ÷ profit. Annual ratios are context.');
 expect(drawer).not.toContain('Meets annual bar');expect(drawer).not.toContain('Below annual bar');
 expect(metric.chart).toBe('Annual owner cash / profit');
 expect(metric.chartThreshold).toBeNull();
 const table=yearTable(d,t);expect(table.markLabel).toBe('Window test');expect(table.rows.every(r=>r.pass===null)).toBe(true);
});
