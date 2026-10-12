import { modelReturn } from './return-model';
import type { IndexRow, PriceMap } from './types';

/** Published companies whose numbers look too good to be true: central value
 * above 4× price, expected return above 40% a year, or owner earnings per share
 * in the first projected year above half the price. Outliers are where bad inputs surface first (3.8.1:
 * PROG Holdings' lease merchandise counted as free cash). A log for review,
 * not a verdict: verdicts follow the data. */
export function valueOutliers(rows: IndexRow[], prices: PriceMap) {
  return rows.flatMap(row => {
    const price = prices[row.id]?.[0], mid = row.v?.[1], model = row.buyReturnInputs?.model;
    if (!(typeof price === 'number' && price > 0) || !(typeof mid === 'number' && mid > 0)) return [];
    const valueToPrice = mid / price, expectedReturn = model ? modelReturn(model, price) : null;
    // First projected year of owner earnings per share (the base year grown once).
    const ownerEarningsYield = model?.annual?.length ? model.annual[0] / price : null;
    const reasons = [
      ...(valueToPrice > 4 ? [`central value ${valueToPrice.toFixed(1)}× price`] : []),
      ...(expectedReturn !== null && expectedReturn > .4 ? [`expected return ${(expectedReturn * 100).toFixed(0)}% a year`] : []),
      ...(ownerEarningsYield !== null && ownerEarningsYield > .5 ? [`owner earnings ${(ownerEarningsYield * 100).toFixed(0)}% of price`] : []),
    ];
    return reasons.length ? [{ id: row.id, buy: row.b === true, valueToPrice, expectedReturn, ownerEarningsYield, reasons }] : [];
  }).sort((a, b) => Number(b.buy) - Number(a.buy) || b.valueToPrice - a.valueToPrice);
}
