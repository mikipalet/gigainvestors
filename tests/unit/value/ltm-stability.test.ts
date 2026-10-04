import {it,expect} from 'vitest';
import {ltmFlapping} from '../../../scripts/value/ltm-stability';
const row=(quarter:string,annual:string,ltm:string)=>({id:'X',quarter,annual,ltm});
it('counts an opening-boundary LTM flip that reverts within two quarters',()=>{
 expect(ltmFlapping([row('2024Q4','F','P'),row('2025Q1','F','P'),row('2025Q2','F','F')],['moat'])).toEqual([{id:'X',test:'moat',quarter:'2024Q4',reverted:'2025Q2',from:'F',to:'P'}]);
});
it('does not count annual changes, persistent LTM changes or reversions after two quarters',()=>{
 expect(ltmFlapping([row('2024Q4','F','F'),row('2025Q1','P','P'),row('2025Q2','F','F')],['moat'])).toEqual([]);
 expect(ltmFlapping([row('2024Q4','F','P'),row('2025Q1','F','P'),row('2025Q2','F','P'),row('2025Q3','F','F')],['moat'])).toEqual([]);
});
