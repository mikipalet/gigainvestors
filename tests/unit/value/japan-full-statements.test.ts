import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { mergeYears, parseEdinetCsv, yearsFromEdinet } from '../../../lib/value/japan/xbrl-csv';
const read = (name: string) => parseEdinetCsv(readFileSync(`tests/fixtures/value/edinet/full-statements/${name}.csv`, 'utf8'));
it('uses balance-sheet cash plus current securities, retaining both reported cash definitions', () => {
 const y = yearsFromEdinet(read('keyence-2025')).at(-1)!;
 expect(y).toMatchObject({cash:1219234000000,cashAndDeposits:579051000000,cashAndCashEquivalents:451715000000,shortTermInvestments:640183000000,da:15193000000,capex:14342000000,costOfSales:171444000000,grossProfit:887700000000});
});
it('keeps full statements through later five-year summaries and restates overlapping prior-year statements', () => {
 const old=yearsFromEdinet(read('keyence-2025'));
 const summary=read('keyence-2026').filter(r=>r.element.endsWith('DEI') || r.element.includes('SummaryOfBusinessResults'));
 expect(mergeYears(old,yearsFromEdinet(summary)).find(y=>y.fy===2025)).toMatchObject({cash:1219234000000,capex:14342000000});
 expect(mergeYears(old,yearsFromEdinet(read('keyence-2026'))).map(y=>[y.fy,y.da,y.capex])).toEqual([[2024,13767000000,12492000000],[2025,15193000000,14342000000],[2026,17227000000,28371000000]]);
});
it('maps Japanese GAAP cash, debt and goodwill without counting goodwill twice in intangibles', () => {
 expect(yearsFromEdinet(read('shinetsu-2025')).at(-1)).toMatchObject({cash:1811678000000,totalDebt:16841000000,goodwill:27431000000,intangibles:9477000000,da:238357000000,capex:439473000000});
});
it('maps Toyota IFRS custom revenue, both PPE spending components and financing debt', () => {
 const years=yearsFromEdinet(read('toyota-2025'));
 expect(years.at(-1)).toMatchObject({revenue:48036704000000,netIncome:4765086000000,cash:8982404000000,da:2251233000000,capex:4903731000000,totalDebt:38792879000000,costOfSales:38458666000000,grossProfit:9578038000000});
 expect(years[0]).toMatchObject({fy:2024,capex:4714107000000});
});
it('adds IFRS short-term investments without including strategic investments or double-counting debt', () => {
 expect(yearsFromEdinet(read('mitsubishi-2025')).at(-1)).toMatchObject({cash:1611961000000,shortTermInvestments:75337000000,da:470768000000,capex:384292000000,totalDebt:5339302000000});
});
it('sums a reported debt component even when the issuer has no long-term borrowings', () => {
 const rows=read('shinetsu-2025').filter(r=>!r.element.endsWith(':LongTermLoansPayable'));
 expect(yearsFromEdinet(rows).at(-1)?.totalDebt).toBe(9389000000);
});
it('recovers Toyota US GAAP current and prior statements from recorded two-column text blocks', () => {
 const years=yearsFromEdinet(read('toyota-2019'));
 expect(years.at(-1)).toMatchObject({fy:2019,da:1792375000000,capex:3738887000000,cashAndCashEquivalents:3574704000000,cash:5828216000000,totalDebt:20150178000000,receivables:2372734000000,inventory:2656396000000,ppe:10685494000000});
 expect(years[0]).toMatchObject({fy:2018,da:1734033000000,capex:3598707000000});
});
it('does not guess ambiguous unseparated numbers or unknown monetary units in US GAAP prose', () => {
 const rows=read('toyota-2019').map(r=>({...r,value:r.value.replace('1,734,0331,792,375','123456').replaceAll('百万円','不明単位')}));
 expect(yearsFromEdinet(rows).at(-1)?.da).toBeNull();
});
it('treats a reported dash as zero, so later statements can remove prior debt or securities', () => {
 const rows=read('shinetsu-2025').map(r=>r.element.endsWith(':LongTermLoansPayable')?{...r,value:'－'}:r);
 expect(yearsFromEdinet(rows).at(-1)?.totalDebt).toBe(9389000000);
});
it('never classifies long-term US GAAP investment securities as current cash', () => {
 const rows=read('toyota-2019').map(r=>r.element.endsWith('ConsolidatedBalanceSheetUSGAAPTextBlock')?{...r,value:r.value.replace('有価証券1,768,3601,127,160','')}:r);
 expect(yearsFromEdinet(rows).at(-1)).toMatchObject({shortTermInvestments:null,cash:4701056000000});
});
it('preserves actual fiscal ends and full statements when later five-year summaries extrapolate the old year end incorrectly', () => {
 const older=yearsFromEdinet(read('keyence-2017'));
 const fy2016=older.find(y=>y.fy===2016)!;
 expect(fy2016.end).toBe('2016-06-20');expect(fy2016.da).not.toBeNull();
 const merged=mergeYears(older,yearsFromEdinet(read('keyence-2019'))).find(y=>y.fy===2016)!;
 expect(merged).toMatchObject({end:'2016-06-20',da:fy2016.da,capex:fy2016.capex,operatingIncome:fy2016.operatingIncome});
});
it('maps recorded Japanese and IFRS SBC expense tags, and separate IFRS debt maturities', () => {
 expect(yearsFromEdinet(read('S100YJK1')).at(-1)).toMatchObject({sbc:6210000,inventory:2732156000});
 expect(yearsFromEdinet(read('S100VJ7H')).at(-1)).toMatchObject({sbc:239767000,totalDebt:7205879000});
 expect(yearsFromEdinet(read('S100PT63')).at(-1)).toMatchObject({da:1325000000});
});
it('sums separate merchandise and finished goods only when an inventory aggregate is absent', () => {
 const rows=read('S100VJ7H').filter(r=>!r.element.endsWith(':InventoriesCAIFRS'));
 expect(yearsFromEdinet(rows).at(-1)?.inventory).toBe(2529640000);
});
