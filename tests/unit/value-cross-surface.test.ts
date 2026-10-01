import {describe,it,expect} from 'vitest';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {EvidencePanel} from '@/components/value/EvidencePanel';
import {TileNumbers} from '@/components/value/DossierNumbers';
import {primaryTileMetric} from '@/lib/value/tile-metric';
import {perShareSeries} from '@/lib/value/history';
import {emptyYear} from '@/lib/value/completeness/second-sources';
import type {Dossier,Fundamentals,TestOutcome} from '@/lib/value/types';
const test:TestOutcome={key:'moat',numeric:'pass',result:'pass',metrics:{roicMedian:.47,roicSecondLowest:.33,grossMarginDrop:0,totalRoicMedian:.365},series:{roic:[[2023,.45],[2024,.47],[2025,.33]],totalRoic:[[2023,.35],[2024,.38],[2025,.365]]},reasons:[],jev:[]};
const dossier={company:{kind:'operating',currency:'USD'},report:{},series:{},tests:{understandable:{series:{}},moat:test}} as unknown as Dossier;
describe('cross-surface regression',()=>{
 it('renders the same excluding-acquisitions ROIC in the tile and drawer',()=>{
  const tile=renderToStaticMarkup(React.createElement(TileNumbers,{metric:primaryTileMetric(test,'operating'),test,currency:'USD'}));
  const drawer=renderToStaticMarkup(React.createElement(EvidencePanel,{dossier,test}));
  expect(tile).toContain('45.0%');
  expect(drawer).toContain('ROIC including acquisitions');
  expect(drawer).toContain('45.0%');
 });
 it('publishes annual net cash, includes investments once, and keeps gaps',()=>{
  const years=[{...emptyYear('2023-12-31','USD'),cash:120,totalDebt:80,shortTermInvestments:20,cashAndCashEquivalents:100}, {...emptyYear('2024-12-31','USD'),cash:null,totalDebt:50}, {...emptyYear('2025-12-31','USD'),cash:100,totalDebt:160}];
  const series=perShareSeries({years} as Fundamentals);
  expect(series.netCash).toEqual([[2023,40],[2024,null],[2025,-60]]);
 });
});

import {auditTestSurfaces,type SurfaceSnapshot} from '@/lib/value/surface-audit';
describe('audit detects drift',()=>{
 const snapshot:SurfaceSnapshot={text:'Earned a median 47% on operating capital excluding acquisitions (minimum 15%), and the second-worst year earned 33% (minimum 10%, allowing one bad year). ROIC ex acquisitions median 47.0% ≥ 15.0%; Second-lowest return (one bad year allowed) 33.0% ≥ 10.0%; 3/3 applied checks met.',numbers:[],charts:[{label:'ROIC excluding acquisitions',series:test.series.roic,format:'pct',currency:'USD'}],stats:[['Median','45.0%'],['Worst','33.0%'],['Latest','33.0%']],table:[],windows:[],priceCharts:[]};
 const drawer={...snapshot,stats:[...snapshot.stats,['Passing bar','≥ 15.0%'],['Years','3']] as Array<[string,string]>,table:[['2023','35.0%','45.0%','✓'],['2024','38.0%','47.0%','✓'],['2025','36.5%','33.0%','✓']]};
 it('accepts matching captured surfaces',()=>expect(()=>auditTestSurfaces(dossier,test,snapshot,drawer)).not.toThrow());
 it.each(['series','currency','format','rounding','year','threshold','count'])('rejects %s drift',field=>{
  const changed=structuredClone(drawer);
  if(field==='series')changed.charts[0].series[0][1]=.99;
  if(field==='currency')changed.charts[0].currency='JPY';
  if(field==='format')changed.charts[0].format='money';
  if(field==='rounding')changed.stats[0][1]='37%';
  if(field==='year')changed.table[0][0]='2022';
  if(field==='threshold')changed.stats[3][1]='≥ 99.0%';
  if(field==='count')changed.stats[4][1]='10';
  expect(()=>auditTestSurfaces(dossier,test,snapshot,changed)).toThrow();
 });
});

import {withReportedFacts} from '@/lib/value/completeness/reported-facts';
describe('primary filing corrections',()=>{
 it('keeps per-share management numbers instead of substituting a share-count chart',()=>{
  const t={key:'management',metrics:{},series:{shares:[[2024,180],[2025,160]]},reasons:[],jev:[],numeric:'unclear',result:'unclear'} as TestOutcome;
  const m=primaryTileMetric(t,'bank');expect(m.chart).toBe('Per-share earnings / book value');expect(m.series).toEqual([]);expect(m.id).toBe('perShareValueChange');
 });
 it('excludes Chubb long-term bonds and restricted cash from the cash aggregate',()=>{
  const [y]=withReportedFacts('CB.US',[{...emptyYear('2025-12-31','USD'),cash:42585000000,totalDebt:17649000000}]);
  expect(y.cash).toBe(7112000000);expect(perShareSeries({years:[y]} as Fundamentals).netCash).toEqual([[2025,-10537000000]]);
 });
});

import {fillYears} from '@/lib/value/completeness/second-sources';
it('reported annual SEC shares supersede a vendor count but preserve an issuer correction',()=>{
 const base={...emptyYear('2025-12-31','USD'),dilutedShares:626043000,provenance:{dilutedShares:{source:'eodhd',field:'dilutedShares',method:'reported' as const}}};
 const sec={...emptyYear('2025-12-31','USD'),dilutedShares:632435108,provenance:{dilutedShares:{source:'https://data.sec.gov/api/xbrl/companyfacts/CIK0001467373.json',field:'WeightedAverageNumberOfDilutedSharesOutstanding',method:'reported' as const}}};
 expect(fillYears([base],[sec])[0].dilutedShares).toBe(632435108);
 expect(fillYears([{...base,provenance:{dilutedShares:{...base.provenance.dilutedShares,source:'https://issuer.example/annual-report'}}}],[sec])[0].dilutedShares).toBe(626043000);
});

import {tileSentence} from '@/lib/value/tile-metric';
it('uses the filing likelihood chart in a drawer when no financial series exists',()=>{
 const t={key:'accounting',result:'pass',numeric:'pass',metrics:{financialRedFlags:0},series:{},reasons:[],jev:[{q:'material_weakness',label:'Control weakness',kind:'noul',value:'no',probability:.1,trusted:false,evidence:null,section:'auditor'}]} as TestOutcome;
 const html=renderToStaticMarkup(React.createElement(EvidencePanel,{dossier:{...dossier,company:{...dossier.company,kind:'bank'}},test:t}));
 expect(html).toContain('data-signals=');expect(html).toContain('10%');expect(html).not.toContain('class="window-chart"');
});
it('calls a negative per-share change a decline',()=>{
 const t={key:'management',metrics:{perShareValueGrowth:-.08,perShareStart:10,perShareEnd:9.2,perShareValueChange:-.8},series:{},reasons:[],jev:[],result:'pass',numeric:'pass'} as TestOutcome;
 expect(tileSentence(t,primaryTileMetric(t,'operating'),'operating')).toContain('Per-share value fell from 10 to 9.2 (must rise and stay positive)');
});
