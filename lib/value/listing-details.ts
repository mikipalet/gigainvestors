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

const EUROPE=new Set(['AT','BE','CH','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU','IE','IS','IT','LT','LU','LV','MT','NL','NO','PL','PT','RO','SE','SI','SK']);
const ASIA=new Set(['CN','HK','JP','IN','ID','KR','MY','PH','SG','TH','TW','VN']);
export function marketRegion(row:{id:string;c:string}) {
 if(row.id.endsWith('.US'))return 'US';
 return row.c==='CA'?'Canada':row.c==='GB'?'UK':row.c==='AU'?'Australia':EUROPE.has(row.c)?'Europe':ASIA.has(row.c)?'Asia':row.c||'Unknown';
}
export function matchesMarket(row:{id:string;c:string},market:string) {
 const region=marketRegion(row);
 return !market||market==='all'||(market==='easy'?['US','Canada','Europe','UK','Australia'].includes(region):market==='asia'?region==='Asia':true);
}
