import type { EdinetRow } from './xbrl-csv';

/** Some EDINET US GAAP filings publish consolidated statements only as flattened
 * text. Read explicitly labelled, two-year, million-yen tables; ambiguous cells
 * remain missing. Never read parent-only statements or the free-form notes. */
export function usGaapStatementRows(rows: EdinetRow[]): EdinetRow[] {
  const result: EdinetRow[] = [];
  const tables = new Map(rows.filter(r => r.context === 'CurrentYearDuration')
    .map(r => [r.element.split(':').at(-1)!, r.value.replace(/\s/g, '').replace(/[＜＞：（）]/g, c => ({'＜':'<','＞':'>','：':':','（':'(','）':')'}[c]!))]));
  const specs: Record<string, Array<[string, string[]]>> = {
    ConsolidatedBalanceSheetUSGAAPTextBlock: [
      ['CashAndCashEquivalents', ['現金及び現金同等物']],
      ['TimeDeposits', ['定期預金']], ['ShortTermInvestments', ['有価証券']],
      ['NotesAndAccountsReceivableTrade', ['受取手形及び売掛金<貸倒引当金控除後>']],
      ['Inventories', ['たな卸資産', '棚卸資産']], ['NotesAndAccountsPayableTrade', ['支払手形及び買掛金']],
      ['PropertyPlantAndEquipment', ['有形固定資産合計']],
      ['ShortTermLoansPayable', ['短期借入債務']],
      ['CurrentPortionOfLongTermLoansPayable', ['１年以内に返済予定の長期借入債務', '1年以内に返済予定の長期借入債務']],
      ['LongTermLoansPayable', ['固定負債長期借入債務']],
      ['CurrentAssets', ['流動資産合計']], ['CurrentLiabilities', ['流動負債合計']],
    ],
    ConsolidatedStatementOfIncomeUSGAAPTextBlock: [
      ['OperatingIncome', ['営業利益']], ['CostOfSales', ['売上原価']],
      ['CostOfFinancingOperationsIFRS', ['金融費用']], ['IncomeBeforeIncomeTaxes', ['税金等調整前当期純利益']],
      ['IncomeTaxes', ['法人税等']], ['InterestExpenses', ['支払利息']],
    ],
    ConsolidatedStatementOfCashFlowsUSGAAPTextBlock: [
      ['DepreciationAndAmortization', ['減価償却費', '減価償却費及び償却費']],
      ['AdditionsToFixedAssetsExcludingEquipmentLeasedToOthersInvCFUSGAAP', ['有形固定資産の購入<賃貸資産を除く>']],
      ['AdditionsToEquipmentLeasedToOthersInvCFUSGAAP', ['賃貸資産の購入']],
      ['PurchaseOfPropertyPlantAndEquipmentInvCFUSGAAP', ['有形固定資産の購入']],
      ['StockBasedCompensation', ['株式報酬費用']],
    ],
  };
  for (const [name, mappings] of Object.entries(specs)) {
    const table = tables.get(name);
    if (!table?.includes('(単位:百万円)') || !table.includes('前連結会計年度')
      || !table.includes('当連結会計年度') || table.includes('前々連結会計年度')) continue;
    for (const [element, labels] of mappings) {
      const currentAssets = name === 'ConsolidatedBalanceSheetUSGAAPTextBlock' && ['CashAndCashEquivalents', 'TimeDeposits', 'ShortTermInvestments', 'NotesAndAccountsReceivableTrade', 'Inventories'].includes(element);
      const scope = currentAssets ? (table.includes('流動資産合計') ? table.split('流動資産合計')[0] : '') : table;
      for (const label of labels) {
        const cells = scope.split(label).slice(1).map(tail => tail.match(/^[△▲\-―－\d,]+/)?.[0]).find(Boolean);
        if (!cells) continue;
        // Grouped thousands give unambiguous boundaries even after EDINET strips
        // cell separators (1,734,0331,792,375). Ungrouped adjacent digits do not.
        const numbers = [...cells.matchAll(/[△▲-]?\d{1,3}(?:,\d{3})+|[―－]/g)].map(m => m[0]);
        if (numbers.length !== 2 || numbers.join('') !== cells) continue;
        numbers.forEach((cell, i) => result.push({element:`edinet_text:${element}`,
          context: i ? 'CurrentYearInstant' : 'Prior1YearInstant', unit:'円',
          value: String(/[―－]/.test(cell) ? 0 : Number(cell.replace(/[△▲]/, '-').replaceAll(',', '')) * 1e6)}));
        break;
      }
    }
  }
  for (const context of ['CurrentYearInstant', 'Prior1YearInstant']) {
    const cash = result.find(r => r.context === context && r.element === 'edinet_text:CashAndCashEquivalents');
    const deposits = result.find(r => r.context === context && r.element === 'edinet_text:TimeDeposits');
    if (cash && deposits) result.push({...cash, element:'edinet_text:CashAndDeposits', value:String(Number(cash.value) + Number(deposits.value))});
  }
  return result;
}
