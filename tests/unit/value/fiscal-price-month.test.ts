import {expect,it} from 'vitest';
import {fiscalPriceMonth} from '@/lib/value/fiscal-price-month';
it.each([
 ['2022-01-02','2021-12'],['2023-01-01','2022-12'],['2024-07-07','2024-06'],
 ['2024-03-01','2024-02'],['2024-12-29','2024-12'],['2024-12-31','2024-12'],['2024-07-08','2024-07'],
])('uses the adjacent fiscal month for %s', (end,month)=>expect(fiscalPriceMonth(end)).toBe(month));
