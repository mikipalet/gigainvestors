import {readCorpusJson} from './corpus';
import {constituentName,type CachedListing} from './cached-listings';
import type {Constituent} from './index-membership';
import reviewedEvidence from './index-figi-evidence.json';
interface Figi {ticker:string;exchCode:string;name:string;shareClassFIGI?:string;securityType2?:string;}
interface Evidence {job:{idType:string;idValue:string;micCode?:string};response:{data?:Figi[]};retrievedAt:string;}
const mic:Record<string,string>={NSE:'XNSE',SG:'XSES',NZ:'XNZE',LSE:'XLON',XETRA:'XETR',PA:'XPAR',SW:'XSWX',ST:'XSTO',SA:'BVMF',AU:'XASX',MX:'XMEX',OL:'XOSL',CO:'XCSE',HE:'XHEL',LS:'XLIS',VI:'XWBO'};
const exchanges:Record<string,string[]>={US:['US'],GR:['F','XETRA'],GF:['F'],GY:['XETRA'],GS:['STU'],GM:['MU'],GB:['BE'],LN:['LSE'],FP:['PA'],NA:['AS'],SW:['SW'],SE:['SW'],SS:['ST'],DC:['CO'],FH:['HE'],NO:['OL'],AU:['AU'],BZ:['SA'],MM:['MX'],SP:['SG'],NZ:['NZ']};
/** OpenFIGI maps a security to listings; ticker-only jobs additionally require name agreement. */
export function figiListings(listings:CachedListing[]) {
 const evidence=Object.values(readCorpusJson<Record<string,Evidence>>('index-membership/openfigi.json')??reviewedEvidence) as Evidence[];
 const tickers=new Map(listings.map(r=>[`${r.Code.toUpperCase().replace(/[ .]/g,'-')}.${r.exchange}`,r]));
 return (row:Constituent):CachedListing[]=>{
  const records=evidence.filter(e=>row.isin?e.job.idType==='ID_ISIN'&&e.job.idValue===row.isin:e.job.idType==='TICKER'&&e.job.idValue===row.code&&e.job.micCode===mic[row.exchange??'']);
  const classes=new Set(records.flatMap(e=>(e.response.data??[]).map(f=>f.shareClassFIGI)).filter(Boolean));
  const expanded=evidence.filter(e=>e.job.idType==='ID_BB_GLOBAL_SHARE_CLASS_LEVEL'&&classes.has(e.job.idValue));
  const result:CachedListing[]=[];
  for(const record of [...records,...expanded])for(const item of record.response.data??[]){
   if(!row.isin && record.job.idType!=='ID_BB_GLOBAL_SHARE_CLASS_LEVEL' && constituentName(item.name)!==constituentName(row.name))continue;
   for(const exchange of exchanges[item.exchCode]??[]){
    const listing=tickers.get(`${item.ticker.toUpperCase().replace(/[ .]/g,'-')}.${exchange}`);
    if(!listing)continue;
    // Provider symbol/name or exact ISIN corroborates the FIGI listing, avoiding recycled tickers.
    if((row.isin&&listing.Isin===row.isin)||constituentName(listing.Name)===constituentName(item.name))result.push(listing);
   }
  }
  return [...new Map(result.map(r=>[`${r.Code}.${r.exchange}`,r])).values()];
 };
}
