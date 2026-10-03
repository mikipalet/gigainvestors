import {expect,it} from 'vitest';
import {targetedStory} from '../../../scripts/value/targeted-story-overlay';
import {SELECTION_VERSION} from '../../../lib/value/price-story/selection';
import type {Dossier} from '../../../lib/value/types';
import type {StoryReading} from '../../../lib/value/price-story/publication';
const d={id:'EX.US',asOf:'2026-10-03',company:{kind:'operating',currency:'USD'},report:{},series:{},tests:{},ownerMemo:{version:1,asOf:'old',inputHash:'preserve',lines:[{question:3,answer:'Live pricing answer',basis:'filing',evidence:[]},{question:6,answer:'Live risk answer',basis:'filing',evidence:[]}]},verdict:'preserve'} as unknown as Dossier;
const grade={version:SELECTION_VERSION,price:{n:40,accuracy:.925},risk:{n:40,accuracy:.925}};
it('retains live memo answers and all other fields on abstention',()=>{
 const result=targetedStory(d,null,null,grade,'2026-10-03T17:00:00Z');
 expect(result.ownerMemo).toEqual(d.ownerMemo);
 const {priceStory,...rest}=result;expect(rest).toEqual(d);expect(priceStory).toBeDefined();
});
it('replaces only accepted literal lines and keeps memo provenance',()=>{
 const reading={version:SELECTION_VERSION,asOf:'2026-10-03T16:00:00Z',price:{selected:null},pricing:{selected:{kind:'pricing',text:'Higher pricing contributed 3% to sales.',source:'SEC filing',date:'2026-02-01',url:'https://example.com',section:'MD&A'}},risk:{selected:null},events:[]} as unknown as StoryReading;
 const result=targetedStory(d,null,reading,grade,'2026-10-03T17:00:00Z');
 expect(result.ownerMemo?.lines.find(l=>l.question===3)?.literal?.text).toBe(reading.pricing.selected?.text);
 expect(result.ownerMemo?.lines.find(l=>l.question===6)).toEqual(d.ownerMemo?.lines[1]);
 expect(result.ownerMemo?.inputHash).toBe('preserve');expect(result.ownerMemo?.asOf).toBe('old');
});
it('inserts accepted answers in question order without moving other answers relative to one another',()=>{
 const live={...d,ownerMemo:{...d.ownerMemo!,lines:[d.ownerMemo!.lines[0],{question:7,answer:'Live price',basis:'computed' as const,evidence:[]}]}};
 const reading={version:SELECTION_VERSION,asOf:'2026-10-03T16:00:00Z',price:{selected:null},pricing:{selected:null},risk:{selected:{kind:'risk',text:'We depend on a single supplier.',source:'SEC filing',date:'2026-02-01',url:'https://example.com',section:'Risk factors'}},events:[]} as unknown as StoryReading;
 const result=targetedStory(live,null,reading,grade,'2026-10-03T17:00:00Z');
 expect(result.ownerMemo?.lines.map(l=>l.question)).toEqual([3,6,7]);
 expect(result.ownerMemo?.lines.filter(l=>l.question!==6)).toEqual(live.ownerMemo.lines);
});
