import {nonOperatingReason,type SecurityClassification} from './fund-exclusion';
import type {Company} from './types';

export interface HeldStock {
 ticker:string; name:string; cusip?:string;
 quarters?:Array<{q:string;holders:Array<{code:string;value:number;activity:string}>}>;
}
export interface HeldSymbol extends SecurityClassification {Code:string;Name:string;Isin?:string|null;CUSIP?:string|null;Currency?:string;Exchange?:string}
export interface HeldMapping {
 ticker:string;name:string;cusip:string|null;id:string|null;
 status:'mapped'|'excluded'|'unresolved'|'outside-window';reason:string; evidence:string[];
}
export interface HeldMembership {version:1;asOf:string;quarters:string[];companies:Company[];ledger:HeldMapping[]}

export function heldStocks<T extends HeldStock>(stocks:T[],quarters:string[],tracked:string[]):T[]{
 const window=new Set([...new Set(quarters)].sort().slice(-8)),owners=new Set(tracked);
 return stocks.filter(s=>s.quarters?.some(q=>window.has(q.q)&&q.holders.some(h=>owners.has(h.code)&&h.value>0&&h.activity!=='sold')));
}

export function securityExclusion(stock:Pick<HeldStock,'ticker'|'name'>,general:SecurityClassification):string|null{
 if(/^(?:ETF|ETC|FUND|Mutual Fund|Closed[- ]End Fund|SPAC|Warrants?|Rights?|Preferred Stock|Units?|Notes?|Bonds?)$/i.test(general.Type??''))return `provider type: ${general.Type}`;
 if(/(?:[.-](?:WS|WT|W|RT|R|U|UN)|\^\w+)$/.test(stock.ticker)||/\b(?:warrants?|WTS\d*|rights|preferred|pfd|notes|units)\b/i.test(stock.name))return 'non-common instrument (ticker/name)';
 return nonOperatingReason({name:stock.name},general);
}

/** A missing symbol is pending investigation, never proof that an issuer is defunct. */
export function mapHeldSecurity(stock:HeldStock,symbols:HeldSymbol[]):HeldMapping{
 const base={ticker:stock.ticker,name:stock.name,cusip:stock.cusip??null,id:null};
 const nameReason=securityExclusion(stock,{});
 if(nameReason)return {...base,status:'excluded',reason:nameReason,evidence:[`holdings:${stock.ticker}`]};
 const code=stock.ticker.toUpperCase().replaceAll('.','-');
 const exact=symbols.filter(s=>s.Code===code||s.Code===stock.ticker.toUpperCase());
 const byCusip=stock.cusip?symbols.filter(s=>s.CUSIP===stock.cusip||s.Isin?.slice(2,-1)===stock.cusip):[];
 // CUSIP conflicts require review, including a ticker reused by a different issuer.
 const choices=byCusip.length?byCusip:exact;
 if(choices.length!==1||/-OLD\d*$/.test(stock.ticker))return {...base,status:'unresolved',reason:choices.length>1?'ambiguous US listing':'no verified current US listing; resolve CUSIP/remaining listing',evidence:['EODHD exchange-symbol-list/US']};
 const symbol=choices[0];
 if(stock.cusip&&symbol.Isin&&symbol.Isin.slice(2,-1)!==stock.cusip&&symbol.CUSIP!==stock.cusip)return {...base,status:'unresolved',reason:'ticker/CUSIP conflict',evidence:[`EODHD:${symbol.Code}.US`]};
 const reason=securityExclusion(stock,symbol)??securityExclusion({ticker:stock.ticker,name:symbol.Name},symbol);
 return {...base,id:`${symbol.Code}.US`,status:reason?'excluded':'mapped',reason:reason??(byCusip.length?'US CUSIP/ISIN match':'exact US ticker (share-class punctuation normalized)'),evidence:[`EODHD exchange-symbol-list/US:${symbol.Code}`,...(symbol.Isin?[`ISIN:${symbol.Isin}`]:[])]};
}

export const inPublicationScope=(company:Company):boolean=>Boolean(company.indexes?.length||company.heldBySuperinvestors);
