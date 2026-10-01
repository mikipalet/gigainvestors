/** A 52/53-week December fiscal year may end in the first week of January. */
export function annualFiscalYear(end: string): number {
 return Number(end.slice(0,4)) - (/^\d{4}-01-0[1-7]$/.test(end) ? 1 : 0);
}
