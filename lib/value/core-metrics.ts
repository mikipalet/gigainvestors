/** Core evidence required to publish a decided test. Other available checks can still fail it. */
export const CORE_METRICS = {
 understandable: 'At least seven annual periods, net loss years, and operating-margin level/variation',
 moat: 'Median and second-lowest return (ROIC; tangible ROE for financial companies)',
 economics: 'Five matched annual owner-earnings and net-income observations',
 management: 'Market-value gain against retained earnings; otherwise per-share earnings/book-value growth between three-year endpoint medians across at least seven annual periods',
 accounting: 'Latest accruals and operating cash backing (cash backing alone for financial companies)',
} as const;
