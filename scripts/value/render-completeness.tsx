/** Exhaustively render all published dossiers, including each evidence Answer panel. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DossierContent } from '../../components/value/DossierContent';
import { OwnerEarningsWaterfall } from '../../components/value/viz/OwnerEarningsWaterfall';
import { EvidencePanel } from '../../components/value/EvidencePanel';
import { gapWording } from '../../lib/value/public-analysis';
import type { Dossier, PriceMap } from '../../lib/value/types';
const root=process.env.VALUE_STAGING_DIR;
assert.ok(root,'Set VALUE_STAGING_DIR');
const prices:PriceMap=Object.assign({},...readdirSync(path.join(root,'prices')).map(file=>JSON.parse(readFileSync(path.join(root,'prices',file),'utf8'))));
let dossiers=0,panels=0;const failures:Array<{id:string;surface:string;match:string}>=[];
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
writeFileSync('test-results/complete-1-render-all.json',JSON.stringify({dossiers,panels,failures},null,2));
console.log(JSON.stringify({dossiers,panels,failures:failures.length}));assert.deepEqual(failures,[]);
