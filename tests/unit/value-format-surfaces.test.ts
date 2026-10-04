import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseDocument,DomUtils} from 'htmlparser2';
import type {Element,AnyNode} from 'domhandler';
import {describe,it,expect} from 'vitest';
import {DossierContent} from '@/components/value/DossierContent';
import {EvidencePanel,ValuationPanel} from '@/components/value/EvidencePanel';
import {CompanyList} from '@/components/value/CompanyList';
import {MainView} from '@/components/value/MainView';
import {PriceStoryPanel} from '@/components/value/PriceStoryPanel';
import {companyMarkdown} from '@/lib/agents/company';
import {checklistMarkdown} from '@/lib/agents/checklist-content';
import {projectDossier} from '@/lib/agent-api/projections';
import {auditTestSurfaces,auditPriceSurfaces,type SurfaceSnapshot} from '@/lib/value/surface-audit';
import {formatMetric} from '@/lib/value/metric-labels';
import {sharePrice} from '@/lib/value/listing-details';
import type {Dossier,IndexRow,PriceMap} from '@/lib/value/types';

const fixture:Dossier=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'];
const render=(component:React.ReactNode)=>parseDocument(renderToStaticMarkup(component));
const all=(root:AnyNode,predicate:(el:Element)=>boolean)=>DomUtils.findAll(predicate,DomUtils.getChildren(root));
const byClass=(root:AnyNode,name:string)=>all(root,el=>(el.attribs.class??'').split(' ').includes(name));
const tags=(root:AnyNode,name:string)=>all(root,el=>el.name===name);
const text=(root:AnyNode)=>DomUtils.textContent(root);
function capture(root:AnyNode):SurfaceSnapshot {
 const years=byClass(root,'drawer-years')[0];
 return {
  text:text(root),numbers:[],
  charts:all(root,e=>'data-series' in e.attribs).map(e=>({label:e.attribs['data-series-label'],series:JSON.parse(e.attribs['data-series']),format:e.attribs['data-format'],currency:e.attribs['data-currency']})),
  stats:[...byClass(root,'tile-support'),...byClass(root,'drawer-numbers')].flatMap(dl=>tags(dl,'div').map(div=>[text(tags(div,'dt')[0]),text(tags(div,'dd')[0])] as [string,string])),
  table:years?tags(tags(years,'tbody')[0],'tr').map(tr=>DomUtils.getChildren(tr).filter(DomUtils.isTag).map(cell=>DomUtils.getChildren(cell).filter(n=>n.type==='text').map(text).join('').trim())):[],
  tableHeaders:years?tags(tags(years,'thead')[0],'th').map(text):[],
  windows:all(root,e=>'data-window' in e.attribs).map(e=>({values:JSON.parse(e.attribs['data-window']),currency:e.attribs['data-currency']})),
  priceCharts:all(root,e=>'data-prices' in e.attribs).map(e=>({prices:JSON.parse(e.attribs['data-prices']),values:JSON.parse(e.attribs['data-values']),mos:Number(e.attribs['data-mos']),currency:e.attribs['data-currency']})),
 };
}
function dossier(currency='USD') {
 const d=structuredClone(fixture);
 d.company.currency=currency;d.reportingCurrency=currency;
 d.valuation=null;d.priceStory=undefined;
 d.tests.moat={key:'moat',numeric:'pass',result:'pass',metrics:{roicMedian:.47,roicSecondLowest:.33,grossMarginDrop:0,totalRoicMedian:.153},series:{roic:[[2023,.45],[2024,.47],[2025,.33]],totalRoic:[[2023,.151],[2024,.153],[2025,.155]]},reasons:[],jev:[]};
 d.series={...d.series,...d.tests.moat.series};
 return d;
}
const rowFor=(d:Dossier):IndexRow=>({id:d.id,n:d.company.name,c:d.company.country,cur:d.company.currency,t:'PPPPP',st:'s',k:'operating',v:[.15,.2,.3],m:.25,mc:1,h:0,g:[],s:null,b:false,w:d.id,quality:{label:'ROIC',value:.153,basis:'including-acquisitions'}});

describe('rendered financial formats across surfaces',()=>{
 it('audits captured tile and drawer output and rejects precision, currency, missing values and source drift',()=>{
  const d=dossier(),page=render(React.createElement(DossierContent,{dossier:d}));
  const tile=capture(all(page,e=>e.attribs['data-testid']==='tile-moat')[0]);
  const drawer=capture(render(React.createElement(EvidencePanel,{dossier:d,test:d.tests.moat})));
  expect(tile.stats.map(([,v])=>v)).toEqual(['45.0%','33.0%','33.0%']);
  expect(()=>auditTestSurfaces(d,d.tests.moat,tile,drawer)).not.toThrow();
  for(const change of ['precision','currency','missing','source']){
   const changed=structuredClone(drawer);
   if(change==='precision')changed.stats[0][1]='45%';
   if(change==='currency')changed.charts[0].currency='EUR';
   if(change==='missing')changed.stats.splice(0,1);
   if(change==='source')changed.charts[0].series[0][1]=.451;
   expect(()=>auditTestSurfaces(d,d.tests.moat,tile,changed)).toThrow();
  }
 });
 it.each(['USD','EUR'])('keeps acquisition-inclusive ROIC identical in the %s shelf, drawer, list, markdown and paid API',currency=>{
  const d=dossier(currency),row=rowFor(d),drawer=render(React.createElement(EvidencePanel,{dossier:d,test:d.tests.moat}));
  const annual=capture(drawer).table.find(r=>r[0]==='2024')!;
  expect(annual[1]).toBe('15.3%'); // inclusive capital, not the moat's 47% denominator
  const list=render(React.createElement(CompanyList,{entries:[{row,quote:.2049,mos:null,expected:.126}]}));
  expect(text(list)).toContain('ROIC 15.3%');
  const shelf=render(React.createElement(MainView,{entries:[{row,quote:.2049,mos:null,expected:.126}],year:'Today'}));
  expect(text(byClass(shelf,'shelf-quality')[0])).toContain('15.3%');
  expect(text(byClass(shelf,'main-return')[0])).toBe('12.6%');
  const markdown=companyMarkdown(d,[.2049,'2026-10-02']);
  expect(markdown).toContain('ROIC including acquisitions, ten-year median: 15.3%');
  const api=projectDossier(d,[.2049,'2026-10-02']);
  const moat=api.tests.find(t=>t.id==='moat')!;
  expect(moat.metrics.totalRoicMedian).toBe(.153);
  expect(moat.series.totalRoic).toEqual([[2023,.151],[2024,.153],[2025,.155]]);
  expect(formatMetric({value:moat.metrics.totalRoicMedian,format:'pct',returnRatio:true})).toBe(annual[1]);
  const price=currency==='USD'?'$0.20':'EUR 0.20';
  expect(text(list)).toContain(price);
  expect(markdown).toContain(`Share price: ${price} per share`);
  const checklist=checklistMarkdown([{...row,quote:[.2049,'2026-10-02'],expected:.126}],null);
  expect(checklist).toContain(`| ${price} |`);expect(checklist).toContain('12.6%');
 });
 it('preserves the capital-return cap in markdown while the paid API retains the uncapped observation',()=>{
  const d=dossier();d.tests.moat.metrics.roicMedian=1.29;d.tests.moat.series.roic=[[2025,1.29]];
  const md=companyMarkdown(d,null);
  expect(md).toContain('ROIC, median of available years: >100%');
  expect(md).toContain('FY2025: >100%');
  expect(projectDossier(d,null).tests.find(t=>t.id==='moat')!.metrics.roicMedian).toBe(1.29);
 });
 it('keeps compact filing totals and financial rates identical in the story drawer and markdown',()=>{
  const d=dossier();
  d.priceStory={version:1,asOf:'2026-10-02',priceDate:'2026-10-02',line:'Reported history',events:[],needs:null,facts:[
   {label:'Sales',text:'Reported sales',unit:'money',points:[[2025,483700000]],url:'https://example.com/filing',date:'2026-02-01'},
   {label:'Margin',text:'Reported margin',unit:'percent',points:[[2025,.153]],url:'https://example.com/filing',date:'2026-02-01'},
  ]};
  const panel=render(React.createElement(PriceStoryPanel,{dossier:d,quote:null}));
  expect(tags(panel,'td').map(text)).toEqual(['484M','15.3%']);
  expect(text(tags(panel,'caption')[0])).toContain('USD');
  const markdown=companyMarkdown(d,null);
  expect(markdown).toContain('FY2025: $484M');
  expect(markdown).toContain('FY2025: 15.3%');
 });
 it('audits price, buy price and return from the rendered page and drawer against the paid API and markdown',()=>{
  const d=structuredClone(fixture),quote:PriceMap[string]=[25.1234,'2026-10-02'];
  const page=render(React.createElement(DossierContent,{dossier:d,quote}));
  const price=capture(all(page,e=>e.attribs['data-testid']==='tile-price')[0]);
  const drawer=capture(render(React.createElement(ValuationPanel,{dossier:d,quote})));
  expect(()=>auditPriceSurfaces(d,undefined,quote,capture(page),price,drawer)).not.toThrow();
  const api=projectDossier(d,quote),md=companyMarkdown(d,quote);
  expect(md).toContain('Share price: $25.12 per share');
  expect(api.valuation!.perShare).toEqual(d.valuation!.perShare);
  expect(api.priceCheck.buyBelow).toBe(d.valuation!.perShare.mid*(1-(d.requiredMos??.25)));
  expect(md).toContain(`Buy below ${drawer.stats[2][1]} per share`);
  expect(md).toContain(`Expected annual return: ${drawer.stats[3][1]}`);
  expect(sharePrice(api.priceCheck.buyBelow,'USD')).toBe(drawer.stats[2][1]);
  expect(formatMetric({value:api.priceCheck.expectedReturn,format:'pct'})).toBe(drawer.stats[3][1]);
  for(const change of ['price','return','missing','discount']){
   const changed=structuredClone(drawer);
   if(change==='price')changed.stats[0][1]='$25.1234';
   if(change==='return')changed.stats[3][1]='13%';
   if(change==='missing')changed.stats.splice(2,1);
   if(change==='discount')changed.stats[5][1]='99.0%';
   expect(()=>auditPriceSurfaces(d,undefined,quote,capture(page),price,changed)).toThrow();
  }
 });
});
