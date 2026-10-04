import {currencyAmount} from '@/lib/format';
/** Listing country, not company domicile. Never infer a US exchange from a ticker. */
export function listingDetails(row: {id:string;c:string;exchange?:string}) {
 const suffix=row.id.split('.').at(-1)?.toUpperCase();
 const venues:Record<string,string>={SHG:'Shanghai',SHE:'Shenzhen',T:'Tokyo',JP:'Tokyo',LSE:'London',PA:'Paris',XETRA:'Xetra',HK:'Hong Kong',AT:'Athens'};
 // Infosys investor FAQ confirms its US ADS listing: https://www.infosys.com/investors/shareholder-services/faqs.html
 const verified:Record<string,string>={'INFY.US':'NYSE'};
 const venue=(row.exchange&&row.exchange!=='US'?row.exchange:verified[row.id])||venues[suffix??'']||'';
 const exchange=venues[venue.toUpperCase()]??venue;
 const country=({US:'US',CN:'China',JP:'Japan',GR:'Greece'} as Record<string,string>)[row.c]??row.c;
 return {country,exchange,note:['SHG','SHE'].includes(suffix??'')?'A-shares · check access':['T','JP'].includes(suffix??'')?'check broker access':''};
}
export function sharePrice(price:number|null,currency:string) {
 return price===null?'':currencyAmount(new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(price),currency);
}

const EUROPE=new Set(['AT','BE','CH','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU','IE','IS','IT','LT','LU','LV','MT','NL','NO','PL','PT','RO','SE','SI','SK']);
const ASIA=new Set(['CN','HK','JP','IN','ID','KR','MY','PH','SG','TH','TW','VN']);
export function marketRegion(row:{id:string;c:string}) {
 if(row.id.endsWith('.US'))return 'US';
 return row.c==='CA'?'Canada':row.c==='GB'?'UK':row.c==='AU'?'Australia':EUROPE.has(row.c)?'Europe':ASIA.has(row.c)?'Asia':row.c||'Unknown';
}
/** The default is Western access; only an explicit all-markets choice widens it. */
export function matchesMarket(row:{w:string|null},market:string) {
 return market==='all'||row.w!=null;
}
