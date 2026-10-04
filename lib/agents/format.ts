export const cell = (text: unknown) => String(text??'').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
// Reuse the fixed formatter across rows and renders; constructing it per cell is costly.
const numberFormatter = new Intl.NumberFormat('en-US',{maximumFractionDigits:4});
export const number = (n: number) => numberFormatter.format(n);
export const percent = (n: number) => `${(n*100).toFixed(1)}%`;
