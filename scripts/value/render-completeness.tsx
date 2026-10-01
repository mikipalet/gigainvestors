/** Exhaustively render all published dossiers, including each evidence Answer panel. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MainView } from '../../components/value/MainView';
import { unpackView, type BrowserPayload } from '../../lib/value/browser-view';
import type { ResultEntry } from '../../lib/value/result-entry';
import { DossierContent } from '../../components/value/DossierContent';
import { OwnerEarningsWaterfall } from '../../components/value/viz/OwnerEarningsWaterfall';
import { EvidencePanel } from '../../components/value/EvidencePanel';
import { gapWording } from '../../lib/value/public-analysis';
import type { Dossier, PriceMap } from '../../lib/value/types';
const root=process.env.VALUE_STAGING_DIR;
assert.ok(root,'Set VALUE_STAGING_DIR');
const prices:PriceMap=Object.assign({},...readdirSync(path.join(root,'prices')).map(file=>JSON.parse(readFileSync(path.join(root,'prices',file),'utf8'))));
let dossiers=0,panels=0,views=0;const failures:Array<{id:string;surface:string;match:string}>=[];
function scan(html:string,id:string,surface:string){
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'').replace(/<(?![^>]*(?:aria-label|title)=)[^>]*>/g,' ');
 const match=text.match(gapWording);if(match)failures.push({id,surface,match:match[0]});
}
for(const file of readdirSync(path.join(root,'dossiers'))){
 const rows=JSON.parse(readFileSync(path.join(root,'dossiers',file),'utf8')) as Record<string,Dossier>;
 for(const d of Object.values(rows)){
  scan(renderToStaticMarkup(createElement(DossierContent,{dossier:d,quote:prices[d.id]??null})),d.id,'page');dossiers++;
  if(d.valuation)scan(renderToStaticMarkup(createElement(OwnerEarningsWaterfall,{valuation:d.valuation})),d.id,'owner cash');
  if(d.status==='scored')for(const test of Object.values(d.tests).filter(t=>t.key!=='price')){
   scan(renderToStaticMarkup(createElement(EvidencePanel,{dossier:d,test})),d.id,test.key);panels++;
  }
 }
}
for(const file of readdirSync(path.join(root,'views'))){
 const rows=unpackView(JSON.parse(readFileSync(path.join(root,'views',file),'utf8')) as BrowserPayload);
 const historical=rows.some(row=>row.historicalPrice!==undefined||row.gain!==undefined);
 const entries:ResultEntry[]=rows.map(row=>({row,quote:row.quote?.[0]??null,expected:row.expected,mos:row.pm??null,historical,historicalPrice:row.historicalPrice,historicalReturn:row.gain}));
 for(const [scope,selected] of [['all',entries],['western',entries.filter(e=>e.row.w)]] as const){
  scan(renderToStaticMarkup(createElement(MainView,{entries:selected,year:historical?'Historical':'Today'})),file,`Shelf+ ${scope}`);views++;
 }
}
writeFileSync(process.env.VALUE_RENDER_REPORT??'test-results/complete-1-render-all.json',JSON.stringify({dossiers,panels,views,failures},null,2));
console.log(JSON.stringify({dossiers,panels,views,failures:failures.length}));assert.deepEqual(failures,[]);
