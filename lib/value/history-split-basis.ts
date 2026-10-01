import type {Fundamentals,PriceHistory} from './types';
// Issuer-confirmed action absent from the EDINET cache. This is a unit conversion,
// not a forecast or an extra observation in historical quality/valuation.
const confirmed:Record<string,Array<{date:string;factor:number;source:string}>>={
 '7203.JP':[{date:'2021-10-01',factor:5,source:'https://global.toyota/pages/global_toyota/ir/stock/share/commonstocksplit_20210512_01_en.pdf'}],
};
/** Reconcile only an explicit action supported by both shares and adjusted prices.
 * Stable shares already match adjusted prices; original-price series stay untouched. */
export function alignHistoryShares(f:Fundamentals,prices:PriceHistory):Fundamentals {
 let years=f.years;
 const actions=[...new Map([...(f.splits??[]),...(confirmed[f.id]??[])].map(s=>[s.date,s])).values()].sort((a,b)=>a.date.localeCompare(b.date));
 for(const split of actions){
  if(!Number.isFinite(split.factor)||split.factor<=0||Math.max(split.factor,1/split.factor)<1.5)continue;
  const before=[...years].filter(y=>y.end<split.date).sort((a,b)=>a.end.localeCompare(b.end)).at(-1),after=[...years].filter(y=>y.end>=split.date).sort((a,b)=>a.end.localeCompare(b.end))[0];
  if(!before?.dilutedShares||!after?.dilutedShares||Math.abs(after.dilutedShares/before.dilutedShares/split.factor-1)>.25)continue;
  const month=split.date.slice(0,7),i=prices.findIndex(([m])=>m===month);
  if(i<1||Math.abs(prices[i][1]/prices[i-1][1]-1)>.3)continue;
  years=years.map(y=>{
   if(y.end>=split.date||!y.dilutedShares)return y;
   const copy={...y,dilutedShares:y.dilutedShares*split.factor};
   // Some filings already restate EPS while retaining the issued share count.
   for(const key of ['basicEps','dilutedEps'] as const)if(y[key]&&y.netIncome&&Math.abs(y[key]!*y.dilutedShares/y.netIncome-1)<.15)copy[key]=y[key]!/split.factor;
   if(y.dividendsPerShare&&y.dividendsPaid&&Math.abs(y.dividendsPerShare*y.dilutedShares/y.dividendsPaid-1)<.15)copy.dividendsPerShare=y.dividendsPerShare/split.factor;
   if(y.edinetShares)copy.edinetShares={...y.edinetShares,...Object.fromEntries(['basic','issued','filing','treasury'].map(k=>[k,y.edinetShares![k as 'basic']===null?null:y.edinetShares![k as 'basic']!*split.factor]))};
   return copy;
  });
 }
 return years===f.years?f:{...f,years};
}
