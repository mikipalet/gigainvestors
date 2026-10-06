import type {TestOutcome} from './types';

/** A retained 3.4 diagnostic must not become a 3.5 applied check. Frozen
 * records have no new basis marker and keep their original fiscal rule. */
export function grossMarginBasis(test:TestOutcome){
 const recentTypical=test.grossMarginBasis==='recent-typical'||'grossMarginTypical' in test.metrics;
 const complete=test.metrics.grossMarginTypical!=null&&test.metrics.grossMarginRecent!=null;
 const retained=recentTypical&&!complete;
 return {
  retained,
  applied:!retained,
  label:recentTypical&&complete?'Typical minus recent gross margin':`FY2019–20 minus FY2023 gross margin${retained?' (prior assessment)':''}`,
 };
}
