import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {budgetUsage,reserveEodhd,syncBudget,withEodhdCeiling} from '@/lib/value/budget';
import {nightlyBudget} from '@/lib/value/nightly-budget';
let root:string;
beforeEach(()=>{root=mkdtempSync(path.join(tmpdir(),'nightly-budget-'));vi.stubEnv('VALUE_CORPUS_DIR',root);});
afterEach(()=>{vi.unstubAllEnvs();rmSync(root,{recursive:true,force:true});});
it('keeps at least 40,000 calls for the remaining nightly work',()=>{
 const plan=nightlyBudget([{id:'A.US',exchange:'US',country:'US',source:'eodhd'}]);
 expect(plan).toMatchObject({reserved:40000,ceiling:60000,quotes:400,yields:4,fx:500,priceHistory:15000});
});
it('reserves more when quote retries plus history would exceed the floor',()=>{
 const plan=nightlyBudget(Array.from({length:70},(_,i)=>({id:`A.X${i}`,exchange:`X${i}`,country:'US',source:'eodhd'})));
 expect(plan).toMatchObject({reserved:43504,ceiling:56496});
});
it('enforces the ceiling for every request, including FX, then releases it to analysis',async()=>{
 syncBudget(59990);
 await withEodhdCeiling(60000,async()=>{
  reserveEodhd({endpoint:'fundamentals/A.US'});
  expect(()=>reserveEodhd({endpoint:'fundamentals/B.US'})).toThrow(/budget/);
  expect(()=>reserveEodhd({endpoint:'eod/EURUSD.FOREX'})).toThrow(/budget/);
  expect(budgetUsage().used).toBe(60000);
 });
 reserveEodhd({endpoint:'eod/US10Y.GBOND'});
 reserveEodhd({endpoint:'eod/EURUSD.FOREX'});
 expect(budgetUsage().used).toBe(60002);
});
it('honors a stricter shared hard cap and releases scope after failure',async()=>{
 vi.stubEnv('VALUE_EODHD_HARD_CAP','50000');syncBudget(49990);
 await expect(withEodhdCeiling(60000,async()=>{
  reserveEodhd({endpoint:'fundamentals/A.US'});
  reserveEodhd({endpoint:'eod/EURUSD.FOREX'});
 })).rejects.toThrow(/budget/);
 vi.stubEnv('VALUE_EODHD_HARD_CAP','100000');
 reserveEodhd({endpoint:'eod/US10Y.GBOND'});expect(budgetUsage().used).toBe(50001);
});
