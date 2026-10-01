import type {Valuation} from './types';
/** All amounts are per share, in one currency. Cash at t=0 is not discounted. */
export interface ReturnModel { cashNow:number; annual:number[]; terminalCash:number; terminalGrowth:number }
export function earningsPath(oe:number,g:number,terminal:number,decadeFade=false):number[]{
 const flows:number[]=[];
 for(let t=1;t<=10;t++){
  const growth=decadeFade?g+(terminal-g)*(t-1)/9:t<=5?g:g+(terminal-g)*(t-5)/5;
  oe*=1+growth;flows.push(oe);
 }
 return flows;
}
export function modelValue(model:ReturnModel,r:number):number{
 const {cashNow,annual,terminalCash,terminalGrowth}=model;
 if(r<=-1||terminalCash>0&&r<=terminalGrowth)return Infinity;
 return cashNow+annual.reduce((pv,cash,i)=>pv+cash/(1+r)**(i+1),0)
  +(terminalCash>0?terminalCash/(r-terminalGrowth)/(1+r)**annual.length:0);
}
export function valuationReturnModel(v:Valuation):ReturnModel|null{
 if(v.method==='owner_earnings'){
  if(!(v.shares>0&&v.normalized>0))return null;
  const annual=earningsPath(v.normalized/v.shares,v.growth,v.terminalGrowth,v.tier==='compounder');
  return {cashNow:v.netCash/v.shares,annual,terminalCash:annual[9]*(1+v.terminalGrowth),terminalGrowth:v.terminalGrowth};
 }
 if(v.method==='book_value'){
  if(!v.financialReturn)return null;
  // The 4x book ceiling is a conservative haircut to distributable earnings,
  // fixed at the required return, rather than a price ceiling inside the solver.
  const cash=Math.min(v.financialReturn.cashPerShare,4*v.normalized*(v.discountRate-v.growth));
  return cash>0?{cashNow:0,annual:[],terminalCash:cash,terminalGrowth:v.growth}:null;
 }
 if(!v.navReturn)return null;
 return {cashNow:0,annual:[...Array<number>(9).fill(0),v.normalized*(1+v.navReturn.cagr)**10],terminalCash:0,terminalGrowth:0};
}
/** No finite IRR exists when time-zero cash already repays the purchase. */
export function cashCoversPrice(model:ReturnModel,price:number):boolean{
 return price>0&&Number.isFinite(price)&&Number.isFinite(model.cashNow)&&model.cashNow>=price
  &&Number.isFinite(model.terminalGrowth)&&model.annual.every(c=>Number.isFinite(c)&&c>=0)&&Number.isFinite(model.terminalCash)&&model.terminalCash>=0
  &&(model.annual.some(c=>c>0)||model.terminalCash>0);
}
export function modelReturn(model:ReturnModel,price:number):number|null{
 const values=[model.cashNow,...model.annual,model.terminalCash,model.terminalGrowth,price];
 if(!values.every(Number.isFinite)||price<=0||price<=model.cashNow||model.annual.some(c=>c<0)||model.terminalCash<0)return null;
 let low=model.terminalCash>0?Math.max(-1,model.terminalGrowth)+1e-12:-1+1e-12,high=1;
 while(modelValue(model,high)>price&&high<1e12)high*=2;
 if(modelValue(model,low)<price||modelValue(model,high)>price)return null;
 for(let i=0;i<100;i++){const mid=(low+high)/2;if(modelValue(model,mid)>price)low=mid;else high=mid;}
 return (low+high)/2;
}

/** Refresh cached financial/NAV valuations with the same cash flows used by returns. */
export function consistentValuation(v:Valuation|null):Valuation|null{
 if(!v||v.method==='owner_earnings')return v;
 const model=valuationReturnModel(v);if(!model)return v;
 const mid=modelValue(model,v.discountRate);
 if(v.method==='book_value'){
  const perShare={low:modelValue(model,v.discountRate+.01),mid,high:modelValue(model,v.discountRate-Math.min(.01,(v.discountRate-v.growth)/2))};
  return {...v,perShare,...(v.perShareTrading?{perShareTrading:{...v.perShareTrading,...Object.fromEntries(Object.entries(perShare).map(([key,value])=>[key,value*v.perShareTrading!.fxRate]))}}:{}),
   assumptions:[...v.assumptions.filter(a=>!/expected return/i.test(a)),'Expected return is the IRR of the same perpetual distributable earnings, with a fixed payout haircut for the 4× book cap at the required rate']};
 }
 return {...v,perShare:{low:mid,mid,high:mid},
  ...(v.perShareTrading?{perShareTrading:{...v.perShareTrading,low:mid*v.perShareTrading.fxRate,mid:mid*v.perShareTrading.fxRate,high:mid*v.perShareTrading.fxRate}}:{}),
  assumptions:[...v.assumptions.filter(a=>!/Expected return =|Buy requires|Value discounts|Expected return is/.test(a)),
   'Value discounts ten-year NAV realization at 10%; NAV and reinvested dividends compound at the capped total-return CAGR',
   'Expected return is the IRR of the same ten-year NAV realization; buy requires a 15% margin below both that discounted value and reported NAV'],
 };
}
