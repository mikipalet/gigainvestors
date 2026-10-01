import {expect,it} from 'vitest';
import {emptyYear} from '@/lib/value/completeness/second-sources';
import {restoreReportedPeriods} from '@/lib/value/completeness/reported-periods';
it('restores PFI June dates without turning the six-month 2024 transition into a full annual year',()=>{
 const years=[{...emptyYear('2023-12-31','NZD'),netIncome:-97792000},{...emptyYear('2024-12-31','NZD'),netIncome:106022000,totalAssets:2186827000},{...emptyYear('2025-12-31','NZD'),netIncome:77725000,totalAssets:2320457000}];
 const fixed=restoreReportedPeriods('PYIYF.US',years);
 expect(fixed.map(y=>y.end)).toEqual(['2023-12-31','2025-06-30','2026-06-30']);
 expect(restoreReportedPeriods('PYIYF.US',fixed)).toEqual(fixed);
 expect(restoreReportedPeriods('PYIYF.US',years.map(y=>({...y,totalAssets:1})))).toEqual(years.map(y=>({...y,totalAssets:1})));
});

it('restores the corroborated PTSB December annual series without inventing another observation',()=>{
 const years=[{...emptyYear('2025-06-30','EUR'),netIncome:162e6,totalAssets:28932e6},{...emptyYear('2026-06-30','EUR'),netIncome:114e6,totalAssets:30465e6}];
 const fixed=restoreReportedPeriods('PTSB.IR',years);
 expect(fixed.map(y=>y.end)).toEqual(['2024-12-31','2025-12-31']);
 expect(fixed.map(y=>y.netIncome)).toEqual([162e6,114e6]);
 expect(restoreReportedPeriods('PTSB.IR',fixed)).toEqual(fixed);
 expect(restoreReportedPeriods('OTHER.IR',years)).toEqual(years);
 const unrelated=years.map(y=>({...y,totalAssets:1}));
 expect(restoreReportedPeriods('PTSB.IR',unrelated)).toEqual(unrelated);
});
it('restores only Karoon’s two fingerprinted post-transition December periods',()=>{
 const years=[{...emptyYear('2023-06-30','USD'),netIncome:163e6},{...emptyYear('2025-06-30','USD'),netIncome:127.5e6,revenue:776.5e6},{...emptyYear('2026-06-30','USD'),netIncome:125.5e6,revenue:628.6e6}];
 const fixed=restoreReportedPeriods('KAR.AU',years);
 expect(fixed.map(y=>y.end)).toEqual(['2023-06-30','2024-12-31','2025-12-31']);
 expect(restoreReportedPeriods('KAR.AU',fixed)).toEqual(fixed);
 expect(restoreReportedPeriods('KAR.AU',years.map(y=>({...y,revenue:1})))).toEqual(years.map(y=>({...y,revenue:1})));
});

it('removes reintroduced vendor dates when correct PFI annual dates are already cached',()=>{
 const years=[{...emptyYear('2024-12-31','NZD'),netIncome:106022000,totalAssets:2186827000},{...emptyYear('2025-06-30','NZD'),netIncome:106022000,totalAssets:2186827000},{...emptyYear('2026-06-30','NZD'),netIncome:77725000,totalAssets:2320457000}];
 expect(restoreReportedPeriods('PYIYF.US',years).map(y=>y.end)).toEqual(['2025-06-30','2026-06-30']);
});

it('uses Oceania’s reported March balance date from 2021 and leaves earlier May periods intact',()=>{
 const ys=['2020-05-31','2021-05-31','2022-05-31'].map(end=>emptyYear(end,'NZD'));
 expect(restoreReportedPeriods('OCA.AU',ys).map(y=>y.end)).toEqual(['2020-05-31','2021-03-31','2022-03-31']);
});
