import {it,expect} from 'vitest';
import {computeFlags} from '@/lib/value/flags/compute';
import {deduplicateBusinessLines} from '@/lib/value/flags/presentation';
import type {Observation} from '@/lib/value/flags/types';
const evidence={quote:'Annual report financial statements',url:'https://www.sec.gov/Archives/test.htm',filed:'2026-01-01',section:'Cash flows'};
const o=(metric:string,value:number,fy=2025):Observation=>({metric,value,fy,currency:'USD',evidence});
const capex=(earnings:number[])=>[...[[2023,150],[2024,200],[2025,250]].flatMap(([fy,v],i)=>[o('capex',v,fy),o('da',100,fy),o('owner-earnings',earnings[i],fy)])];
it('only marks rising three-year capex above 2x red when owner earnings lag',()=>{
 expect(computeFlags(capex([100,110,120])).find(f=>f.kind==='capital-intensity')?.tone).toBe('red');
 expect(computeFlags(capex([100,140,180])).find(f=>f.kind==='capital-intensity')?.tone).toBe('neutral');
 expect(computeFlags(capex([100,110,120]).filter(o=>o.fy>2023)).find(f=>f.kind==='capital-intensity')?.tone).toBe('neutral');
 expect(computeFlags(capex([100,110,120]).filter(o=>o.metric!=='owner-earnings')).find(f=>f.kind==='capital-intensity')?.tone).toBe('neutral');
});
it('uses goodwill / assets and ignores buyback-depleted equity',()=>{
 const flags=computeFlags([o('goodwill',60),o('equity',1),o('total-assets',100)]);
 expect(flags.find(f=>f.kind==='goodwill-assets')?.label).toBe('Goodwill 60% of total assets');
 expect(computeFlags([o('goodwill',40),o('equity',1),o('total-assets',100)])).toEqual([]);
 expect(computeFlags([o('goodwill',60),o('equity',1)])).toEqual([]);
});
it('specific dividend evidence displaces a generic near-duplicate',()=>{
 const lines=[{id:'a',text:'Has paid dividends to shareholders.',priority:99,why:'',kind:'reading' as const},{id:'b',text:'Dividend raised 64 consecutive years',priority:80,why:'',kind:'flag' as const},{id:'c',text:'Higher prices held up alongside demand',priority:70,why:'',kind:'flag' as const}];
 expect(deduplicateBusinessLines(lines).map(l=>l.id)).toEqual(['b','c']);
});
