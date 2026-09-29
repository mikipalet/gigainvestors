/** Listing country, not company domicile. Never infer a US exchange from a ticker. */
export function listingDetails(row: {id:string;c:string;exchange?:string}) {
 const suffix=row.id.split('.').at(-1)?.toUpperCase();
 const venues:Record<string,string>={SHG:'Shanghai',SHE:'Shenzhen',T:'Tokyo',JP:'Tokyo',LSE:'London',PA:'Paris',XETRA:'Xetra',HK:'Hong Kong',AT:'Athens'};
 // Infosys investor FAQ confirms its US ADS listing: https://www.infosys.com/investors/shareholder-services/faqs.html
 const verified:Record<string,string>={'INFY.US':'NYSE'};
 const venue=(row.exchange&&row.exchange!=='US'?row.exchange:verified[row.id])||venues[suffix??'']||'Exchange unavailable';
 const exchange=venues[venue.toUpperCase()]??venue;
 const country=({US:'US',CN:'China',JP:'Japan',GR:'Greece'} as Record<string,string>)[row.c]??row.c;
 return {country,exchange,note:['SHG','SHE'].includes(suffix??'')?'A-shares · check access':['T','JP'].includes(suffix??'')?'check broker access':''};
}
export function sharePrice(price:number|null,currency:string) {
 return price===null?'Price unavailable':`${currency} ${new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(price)}`;
}
