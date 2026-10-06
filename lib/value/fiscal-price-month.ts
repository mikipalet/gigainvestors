/** Monthly prices are month-end closes. A 52/53-week fiscal year ending in
 * the first week belongs beside the preceding month-end, not a close almost
 * a month after the accounts. Preserve the month-end approximation otherwise. */
export function fiscalPriceMonth(end: string): string {
  return Number(end.slice(8, 10)) <= 7
    ? new Date(Date.UTC(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, 0)).toISOString().slice(0, 7)
    : end.slice(0, 7);
}
