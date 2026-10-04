import { expect, it } from 'vitest';
import { listingDetails, sharePrice } from '@/lib/value/listing-details';
import { MiniSeries } from '@/components/value/viz/MiniSeries';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
it('keeps listing venue and currency explicit without guessing a US exchange',()=>{
 expect(listingDetails({id:'INFY.US',c:'US',exchange:'NYSE'})).toMatchObject({country:'US',exchange:'NYSE',note:''});
 expect(listingDetails({id:'UNKNOWN.US',c:'US'}).exchange).toBe('');
 expect(listingDetails({id:'600809.SHG',c:'CN'})).toMatchObject({exchange:'Shanghai',note:'A-shares · check access'});
 expect(listingDetails({id:'6378.JP',c:'JP'})).toMatchObject({exchange:'Tokyo',note:'check broker access'});
 expect(sharePrice(null,'USD')).toBe('');
 expect(sharePrice(12.56,'USD')).toBe('$12.56');
});
it('draws the passing region below a lower-is-better threshold and above a higher-is-better threshold',()=>{
 for(const better of ['lower','higher'] as const){
 const html=renderToStaticMarkup(createElement(MiniSeries,{series:[[2020,-.2],[2025,.3]],threshold:.1,label:'Cash and profit',better}));
 const rect=html.match(/<rect data-good-side="[^"]+" x="[^"]+" y="([^"]+)" width="[^"]+" height="([^"]+)"/)!;
 expect(rect).not.toBeNull();
 // With domain -.2 to .3 the .1 threshold lies at y=24; the chart runs y=12..42 (13px label clearance).
 expect(Number(rect[1])).toBeCloseTo(better==='higher'?12:24);
 expect(Number(rect[2])).toBeCloseTo(better==='higher'?12:18);
 expect(html).toContain('2020');expect(html).toContain('2025');
 }
});
