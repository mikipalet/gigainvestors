/** Public company identity: US listings omit .US; other exchanges retain their suffix. */
export function companyTicker(id: string): string {
 return id.toUpperCase().replace(/\.US$/, '');
}
export function companyPath(id: string): string { return `/s/${encodeURIComponent(companyTicker(id))}`; }
export function dossierId(ticker: string): string {
 const id=ticker.toUpperCase();
 // Frankfurt's .F is an exchange suffix; US share classes such as BRK.B are not.
 return /\.(?:F|[A-Z]{2,5})$/.test(id)?id:`${id}.US`;
}
export function withQuarter(path: string, quarter?: string | null): string {
 quarter=quarter?.replace(/\s/g,'');
 if(!quarter || !/^\d{4}Q[1-4]$/.test(quarter))return path;
 const url=new URL(path,'https://gigainvestors.com');
 if(!url.searchParams.has('q'))url.searchParams.set('q',quarter);
 return `${url.pathname}${url.search}${url.hash}`;
}
