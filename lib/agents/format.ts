export const cell = (text: unknown) => String(text??'').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
export const number = (n: number) => new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(n);
export const percent = (n: number) => `${(n*100).toFixed(1)}%`;
