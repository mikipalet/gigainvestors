import type {StockData,StockQuarter} from '../types';
/** 13F values are USD. Share quantities/prices across classes or ADR ratios are not additive. */
export function mergeListingHoldings(ticker:string,name:string,input:(StockData|null)[]):StockData|null{
 const stocks=[...new Map(input.filter((s):s is StockData=>Boolean(s)).map(s=>[s.ticker,s])).values()];
 if(!stocks.length)return null;
 if(stocks.length===1)return stocks[0];
 const quarters:StockQuarter[]=[...new Set(stocks.flatMap(s=>s.quarters.map(q=>q.q)))].sort().map(q=>{
  const holders=new Map<string,StockQuarter['holders'][number]>();
  for(const row of stocks.flatMap(s=>s.quarters.filter(r=>r.q===q)))for(const h of row.holders){
   const old=holders.get(h.code);
   holders.set(h.code,{code:h.code,value:(old?.value??0)+h.value,pct:(old?.pct??0)+h.pct,activity:h.activity==='sold'&&(!old||old.activity==='sold')?'sold':'hold',change:null});
  }
  return {q,price:null,holders:[...holders.values()].sort((a,b)=>b.value-a.value||a.code.localeCompare(b.code))};
 });
 return {ticker,name,quarters,combinedListings:stocks.map(s=>s.ticker)};
}
