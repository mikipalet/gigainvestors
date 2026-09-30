import {describe,it,expect} from 'vitest';
import {dropToBuy,historyRatio,radialRadius,seriesPath,sectorAngles,spreadLabels} from '@/lib/value/viz-lab-three';
describe('visual lab numerical encodings',()=>{
 it('shows the price reduction needed, not the premium to buy price',()=>{
  expect(dropToBuy(1.1)).toBe('needs −9%');
  expect(dropToBuy(2)).toBe('needs −50%');
  expect(dropToBuy(.9)).toBe('At buy price');
 });
 it('never substitutes price/value or today’s discount for historical buy price',()=>{
  expect(historyRatio(['X','PPPPP',.8,true,.4])).toBeNull();
  expect(historyRatio(['X','PPPPP',.8,true,.4,{price:60,buyPrice:80,discount:.25}])).toBe(.75);
 });
 it('keeps radial price distance exact and sector angles independent of filters',()=>{
  expect(radialRadius(1,100)).toBe(100);
  expect(radialRadius(.5,100)).toBe(50);
  expect(radialRadius(1.5,100)).toBe(150);
  expect(sectorAngles('Technology')).toBeCloseTo(-Math.PI/2);
  expect(sectorAngles('Financial Services')).toBeCloseTo(Math.PI/3);
 });
 it('breaks lines across missing years and excludes future observations',()=>{
  const points=[{year:2016,ratio:2},{year:2017,ratio:null},{year:2018,ratio:.8},{year:2019,ratio:3}];
  const path=seriesPath(points,2016,2018,100,50);
  expect(path.match(/M/g)).toHaveLength(2);
  expect(path).not.toContain('L');
 });
 it('separates slope labels without moving their underlying price endpoints',()=>{
  const input=[{y:90,id:'a'},{y:91,id:'b'},{y:92,id:'c'}];
  const placed=spreadLabels(input,20,160,44);
  expect(placed.map(p=>p.y)).toEqual([90,91,92]);
  expect(placed[1].labelY-placed[0].labelY).toBeGreaterThanOrEqual(44);
  expect(placed[2].labelY-placed[1].labelY).toBeGreaterThanOrEqual(44);
  expect(placed[0].labelY).toBeGreaterThanOrEqual(20);
  expect(placed[2].labelY).toBeLessThanOrEqual(160);
 });
});
