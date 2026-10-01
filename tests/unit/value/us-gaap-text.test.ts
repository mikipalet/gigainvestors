import {expect,it} from 'vitest';
import {usGaapStatementRows} from '@/lib/value/japan/us-gaap-text';
const row=(element:string,value:string)=>({element,context:'CurrentYearDuration',unit:null,value});
it('reads separate amount and percentage columns without folding percentages into yen',()=>{
 const rows=usGaapStatementRows([row('ConsolidatedStatementOfIncomeUSGAAPTextBlock','前連結会計年度 当連結会計年度 金額（百万円）百分比（％）金額（百万円）百分比（％）営業利益  424,06023.4 297,88717.7Ⅲ その他')]);
 expect(rows.filter(r=>r.element==='edinet_text:OperatingIncome').map(r=>r.value)).toEqual(['424060000000','297887000000']);
});
it('reads consolidated profit and capex in numbered fiscal-year cash-flow columns',()=>{
 const rows=usGaapStatementRows([row('ConsolidatedStatementOfCashFlowsUSGAAPTextBlock','第88期 第89期 金額（百万円）金額（百万円）１ 当期純利益 14,873 31,277２ 営業活動との調整 (1）減価償却費33,450 33,778 (2）株式報酬費用1,376 685 (3）その他 ３ 資本的支出 △48,993 △53,105４ 事業の買収')]);
 expect(rows.filter(r=>r.element==='edinet_text:NetIncomeLossUSGAAP').map(r=>r.value)).toEqual(['14873000000','31277000000']);
 expect(rows.filter(r=>r.element==='edinet_text:PurchaseOfPropertyPlantAndEquipmentInvCFUSGAAP').map(r=>r.value)).toEqual(['-48993000000','-53105000000']);
});
it('does not consume a three-year or parent-only statement',()=>{
 expect(usGaapStatementRows([row('StatementOfCashFlowsUSGAAPTextBlock','第88期 第89期 金額（百万円）当期純利益 14,873 31,277')])).toEqual([]);
 expect(usGaapStatementRows([row('ConsolidatedStatementOfIncomeUSGAAPTextBlock','前々連結会計年度 前連結会計年度 当連結会計年度 金額（百万円）百分比（％）営業利益 424,06023.4 297,88717.7')])).toEqual([]);
});
