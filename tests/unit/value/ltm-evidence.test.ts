import {it,expect} from 'vitest';
import {groupedEvidence} from '@/components/value/BusinessDepth';
import type {Evidence} from '@/lib/value/judgement/types';
it('keeps every calculation while collapsing duplicate links to the same SEC facts document',()=>{
 const rows=[{url:'https://data.sec.gov/api/xbrl/companyfacts/CIK0001397187.json#filing-1',filed:'2026-03-17',section:'Calculated from annual statements',quote:'2019 cash: 42'},
 {url:'https://data.sec.gov/api/xbrl/companyfacts/CIK0001397187.json#filing-2',filed:'2026-03-17',section:'Calculated from annual statements',quote:'2020 cash: 84'}] as Evidence[];
 expect(groupedEvidence(rows)).toEqual([{...rows[0],url:rows[0].url.split('#')[0],quote:'2019 cash: 42\n\n2020 cash: 84'}]);
 expect(rows[0].quote).toBe('2019 cash: 42');
 expect(groupedEvidence(rows.map((r,i)=>({...r,url:`https://www.sec.gov/Archives/edgar/report-${i}.htm`})))).toHaveLength(2);
});
