import { describe, it, expect } from 'vitest';
import { dateLabel, priceState, returnDisplay } from '@/lib/value/presentation';
import { compactMoney } from '@/lib/format';
describe('one display contract', () => {
  it('uses three significant figures for compact money', () => {
    expect(compactMoney(28e9, 'USD')).toBe('USD 28.0B');
    expect(compactMoney(483.7e6, 'USD')).toBe('USD 484M');
    expect(compactMoney(4e9, 'USD')).toBe('USD 4.00B');
  });
  it('uses Sep everywhere', () => expect(dateLabel('2026-09-29')).toBe('29 Sep 2026'));
  it('names a known discount above the buy line Wait', () => {
    expect(priceState({price:80,mid:100,b:false}).state).toBe('wait');
    expect(priceState({price:null,mid:100,b:false}).state).toBe('unclear');
  });
  it('does not print artefact returns or call negative capital insufficient', () => {
    expect(returnDisplay({value:7.08,years:10}).label).toBe('>100%');
    expect(returnDisplay({value:1.000001,years:10}).note).not.toContain('Exact return');
    expect(returnDisplay({value:1.000001,years:10,financial:true}).label).toBe('ROE >100%');
    expect(returnDisplay({value:null,years:10,unlimited:true}).label).toBe('Positive earnings, nonpositive capital');
    expect(returnDisplay({value:null,years:3}).label).toBe('3 years on file');
  });
});

import { assertIndexConsistency } from '@/lib/value/consistency';
import type { StoreMeta, IndexRow } from '@/lib/value/types';
it('blocks a published headline/table contradiction',()=>{
 const meta={counts:{analysed:100,scored:100,insufficient:0,universe:100},funnel:{analysed:100,gates:[{key:'accounting',passing:2},{key:'price',passing:0}]}} as StoreMeta;
 expect(()=>assertIndexConsistency({meta,rows:[{t:'PPPPP'}] as IndexRow[]})).toThrow('headline');
 expect(()=>assertIndexConsistency({meta,rows:[{t:'PPPPP'},{t:'PPPPP'}] as IndexRow[]})).not.toThrow();
});
it('does not expose legacy ex-goodwill unlimited returns as inclusive ROIC',async()=>{
 const {dossierReturn}=await import('@/lib/value/presentation');
 const d={company:{kind:'operating'},tests:{moat:{metrics:{roicMedian:null},series:{roic:[[2025,null]]},reasons:['tangible capital is negative: returns effectively unlimited']}}};
 expect(dossierReturn(d as any).label).toBe('');
});
