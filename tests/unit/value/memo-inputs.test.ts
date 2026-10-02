import {expect,it} from 'vitest';
import {memoInputHash,memoStatementYears} from '@/lib/value/memo-inputs';
import type {Analysis,Year} from '@/lib/value/types';

it('uses only the statement snapshot belonging to the analysis',()=>{
 const a={id:'X.US',asOf:'2026-10-02',company:{currency:'USD'}} as Analysis;
 const years=[{fy:2025,dilutedShares:50}] as Year[];
 expect(memoStatementYears(a,{asOf:a.asOf,memoYears:years})).toEqual(years);
 expect(memoStatementYears(a,{asOf:'old',memoYears:years})).toBeUndefined();
});
it('does not queue research again for a clock or composed-memo change',()=>{
 const a={id:'X.US',asOf:'yesterday',company:{},tests:{}} as Analysis;
 const before=memoInputHash({analysis:a,years:[],facts:{},price:[10,'2026-10-02']});
 expect(memoInputHash({analysis:{...a,asOf:'today',ownerMemo:{asOf:'today'}},years:[],facts:{},price:[10,'2026-10-02']})).toBe(before);
 expect(memoInputHash({analysis:a,years:[{fy:2025,revenue:100}],facts:{},price:[10,'2026-10-02']})).not.toBe(before);
 expect(memoInputHash({analysis:a,years:[],facts:{},price:[11,'2026-10-02']})).not.toBe(before);
});
