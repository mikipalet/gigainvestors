import { describe, expect, it } from 'vitest';
import { packSwarm, pricePosition, priceTicks, returnPosition, returnTicks, bandFor, bands, shortName } from '@/lib/value/viz-layout';

describe('valuation axes',()=>{
 it('keeps the buy threshold exact and gives nearby prices more resolution',()=>{
  expect(pricePosition(1)).toBeCloseTo(.20);
  expect(pricePosition(1.5)-pricePosition(1)).toBeGreaterThanOrEqual(pricePosition(3)-pricePosition(1.5));
  const values=[0,.6,1,1.2,1.5,3,10,100,1000];
  expect(values.map(pricePosition)).toEqual(values.map(pricePosition).sort((a,b)=>a-b));
  expect(priceTicks.map(t=>t.value)).toContain(1);
  expect(returnPosition(.1)).toBeCloseTo(.6);
  expect(returnTicks.map(t=>t.value)).toContain(.1);
 });
 it('uses explicit inclusive band boundaries and never classifies missing data as cheap',()=>{
  expect([.9,1,1.2,1.5,3,3.1,null].map(v=>bandFor(v,true))).toEqual([0,0,1,2,3,4,5]);
  expect(bandFor(.8,false)).toBe(5);
  expect(bands[5].label).toMatch(/review/i);
 });
});
describe('deterministic swarm packing',()=>{
 it('never overlaps or moves an exact x coordinate, and reports overflow instead of hiding marks',()=>{
  const points=Array.from({length:372},(_,i)=>({id:String(i),x:(i%31)*9,width:i<14?75:20,height:20}));
  const layout=packSwarm(points,240,2);
  expect(packSwarm([...points].reverse(),240,2)).toEqual(layout);
  expect(layout.length).toBe(372);
  for(const p of layout){
   expect(p.x).toBe(points.find(q=>q.id===p.id)!.x);
   expect(p.y).toBeGreaterThanOrEqual(0);
   for(const q of layout){if(p.id>=q.id||p.page!==q.page)continue;
    expect(p.x+p.width+1.99<=q.x||q.x+q.width+1.99<=p.x||p.y+p.height+1.99<=q.y||q.y+q.height+1.99<=p.y).toBe(true);
   }
   expect(p.y+p.height).toBeLessThanOrEqual(240);
  }
 });
 it('keeps all identical-value companies reachable across bounded pages',()=>{
  const result=packSwarm(Array.from({length:30},(_,i)=>({id:String(i),x:10,width:20,height:20})),100,0);
  expect(new Set(result.map(p=>p.page)).size).toBe(6);
  expect(result.every(p=>p.x===10)).toBe(true);
 });
 it('does not use ellipses as the only company identification',()=>{
  expect(shortName('Microsoft Corporation',14)).toBe('Microsoft');
  expect(shortName('Very Long Company Name Holdings Ltd',12).length).toBeLessThanOrEqual(12);
 });
});

it('faceted swarms keep every company inside its labelled row and page',async()=>{
 const {packFacets}=await import('@/lib/value/viz-layout');
 const points=Array.from({length:60},(_,i)=>({id:String(i),x:i%4*22,width:20,height:20,facet:`Sector ${i%7}`}));
 const result=packFacets(points,240,70,2);
 expect(result.points).toHaveLength(points.length);
 for(const p of result.points){
  const lane=result.lanes.find(l=>l.page===p.page&&l.name===points.find(q=>q.id===p.id)!.facet)!;
  expect(p.y).toBeGreaterThanOrEqual(lane.y+18);
  expect(p.y+p.height).toBeLessThanOrEqual(lane.y+lane.height);
 }
});

it('preserves published historical picks when their original buy discount is absent',()=>{
 expect(bandFor(1.4,true,true)).toBe(0);
 expect(bandFor(1.4,false,true)).toBe(2);
});
