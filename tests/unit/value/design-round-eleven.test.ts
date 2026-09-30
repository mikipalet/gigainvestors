import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {browserRow} from '@/lib/value/browser-view';
import {BuyZone} from '@/components/value/BuyZone';
import {BUY_RAMP,buyColour} from '@/lib/value/presentation';
import type {IndexRow,Valuation} from '@/lib/value/types';
import fixtures from '../../fixtures/value/treemap-round-ten.json';
const entry=(id:string,growth:number)=>({row:browserRow({...fixtures[0].row,id,nameEn:id,b:true,w:null,dataQualityFlags:[],ownerReturnInputs:{valuation:{method:'owner_earnings',currency:'USD',normalized:80,shares:10,growth} as Valuation,marketCapUsd:1000}} as unknown as IndexRow,[100,"2026-09-30"]),quote:100,mos:.4});
it('ranks buy companies by expected return and emphasizes only the first',()=>{
 const html=renderToStaticMarkup(createElement(BuyZone,{entries:[entry('LOW.US',.02),entry('HIGH.US',.08),entry('MID.US',.04)]}));
 expect(html.indexOf('href="/high.us"')).toBeLessThan(html.indexOf('href="/mid.us"'));
 expect(html.indexOf('href="/mid.us"')).toBeLessThan(html.indexOf('href="/low.us"'));
 expect(html.match(/data-priority="true"/g)).toHaveLength(1);
 expect(html).toContain('data-rank="3"');
 expect(renderToStaticMarkup(createElement(BuyZone,{entries:[]}))).not.toContain('data-priority="true"');
});
it('uses light treemap tints with accessible dark text in every bucket',()=>{
 const lum=(hex:string)=>{const c=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 for(const ratio of [null,1,2,3,4,6,8]){const c=buyColour(ratio);expect(lum(c.background)).toBeGreaterThan(.45);expect((lum(c.background)+.05)/(lum(c.color)+.05)).toBeGreaterThanOrEqual(4.5);}
 expect(new Set(BUY_RAMP).size).toBe(6);
});
