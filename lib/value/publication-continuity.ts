import type {ShareObservation} from './share-check';
import type {Valuation} from './types';
/** Only an issuer filing on the comparable listing basis may overturn a
 * published denominator. Vendor disagreement remains a review signal. */
export function issuerShareContradictions(valuation:Valuation|null,observations:ShareObservation[],date:string,splits:Array<{date:string;factor:number}>=[]):ShareObservation[]{
 if(!valuation||valuation.method==='nav')return [];
 const basis=valuation.shareBasis==='listing-ADS'?'listing-ADS':valuation.shareBasis==='effective-common'?'effective-common':'all-ordinary-outstanding';
 const eligible=observations.filter(o=>o.source.startsWith('issuer:')&&!o.corroborationOnly&&o.basis===basis&&/^https:\/\//.test(o.url??'')&&o.date&&o.date<=date&&Date.parse(date)-Date.parse(o.date)<=200*86400000&&Number.isFinite(o.shares)&&o.shares>0);
 const latest=eligible.map(o=>o.date!).sort().at(-1);
 return eligible.filter(o=>o.date===latest).filter(o=>{
  const count=o.shares*splits.filter(s=>s.date>o.date!&&s.date<=date).reduce((n,s)=>n*s.factor,1);
  return Math.abs(valuation.shares/count-1)>.02+Number.EPSILON*4;
 });
}

/** Bind a cached SEC cover count to its filing, rather than treating a vendor
 * or a market-cap-derived estimate as an issuer contradiction. */
export function issuerFilingShareObservations(raw:unknown,facts:unknown,date:string):ShareObservation[]{
 const data=raw as any,primary=facts as any,g=data?.General;
 if(g?.Type!=='Common Stock'||/\bADR\b|depositary|\bclass\s+[A-Z]\b|\b(?:non.?voting|preferred)\b/i.test(g.Name??''))return [];
 if(!Number.isInteger(primary?.cik))return [];
 const rows=primary?.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares;
 if(!Array.isArray(rows))return [];
 return rows.filter(f=>!f.start&&f.end<=date&&f.filed<=date&&Date.parse(date)-Date.parse(f.end)<=200*86400000&&['10-Q','10-K','20-F','40-F'].includes(f.form)&&/^\d{10}-\d{2}-\d{6}$/.test(f.accn)&&Number.isFinite(f.val)&&f.val>0)
  .map(f=>({source:'issuer:sec-cover',shares:f.val,date:f.end,basis:'all-ordinary-outstanding',url:`https://www.sec.gov/Archives/edgar/data/${primary.cik}/${f.accn.replaceAll('-','')}/${f.accn}-index.html`}));
}
