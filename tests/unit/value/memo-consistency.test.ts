import {it,expect} from 'vitest';
import {consistentMemoLines} from '../../../lib/value/business/memo-validation';
import type {Analysis} from '../../../lib/value/types';
import type {MemoLine} from '../../../lib/value/owner-memo';
const evidence=[{url:'https://issuer.test/annual',filed:'2026',section:'Annual',quote:'FY2025 gross margin 56.6%; return on capital 47%.'}];
const a={company:{kind:'operating'},tests:{moat:{series:{grossMargin:[[2025,.566]],roic:[[2025,.47]]}}}} as unknown as Analysis;
const line=(question:number,answer:string):MemoLine=>({question,answer,evidence,basis:'computed'});
it('rejects memo percentages that contradict the displayed dossier series',()=>{
 expect(consistentMemoLines(a,[line(1,'Keeps 80 cents per sales dollar after product costs.'),line(2,'It earns 90% on its capital.')])).toEqual([]);
 expect(consistentMemoLines(a,[line(1,'Keeps 56.6 cents per sales dollar after product costs.'),line(2,'It earns 47% on its capital.')])).toHaveLength(2);
});
it('rejects a pricing line that contradicts the same-year margin in another line',()=>{
 const q1=line(1,'Keeps 56.6 cents per sales dollar after product costs.');
 expect(consistentMemoLines(a,[q1,{...line(3,'Prices rose 4%; gross margin fell to 70%.'),basis:'filing'}])).toEqual([q1]);
});
