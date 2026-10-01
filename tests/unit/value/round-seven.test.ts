import { expect, test } from 'vitest';
import * as presentation from '../../../lib/value/presentation';

test('legacy CJK-only names fall back to an identifiable listing, never an untranslated heading', () => {
 expect(presentation.companyName({nameEn:'Keyence Corporation',name:'株式会社キーエンス',id:'6861.JP'})).toBe('Keyence');
 expect(presentation.companyName({name:'株式会社キーエンス',id:'6861.JP'})).toBe('Company 6861.JP');
});
test('price colour gets lighter as price rises, with readable text throughout', () => {
 const luminance=(hex:string)=>{const rgb=hex.match(/\w\w/g)!.map(h=>parseInt(h,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 let previous=-1;
 for(const ratio of [.4,.8,1,1.2,1.8,2.5,4,5,6,8]) {
  const {background,color}=presentation.buyColour(ratio);
  const l=luminance(background.slice(1)),t=luminance(color.slice(1));
  expect(l).toBeGreaterThanOrEqual(previous);previous=l;
  expect((Math.max(l,t)+.05)/(Math.min(l,t)+.05)).toBeGreaterThanOrEqual(4.5);
 }
 expect(presentation.buyColour(null).unknown).toBe(true);
});

import { tileSentence } from '../../../lib/value/tile-metric';
import type { TestOutcome } from '../../../lib/value/types';
test('negative accruals describe cash exceeding profit, not a failed absolute-value threshold', () => {
 const test={key:'accounting',result:'pass',numeric:'pass',metrics:{accruals:-.3,cashBacked:1},series:{},reasons:[],jev:[]} as TestOutcome;
 expect(tileSentence(test,{id:'accruals',value:-.3,label:'Accruals',format:'pct',threshold:.1,better:'lower',series:[],chart:''},'operating')).toContain('accruals were -30% of assets (limit 10%)');
});
