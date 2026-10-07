/** Research diagnostics on identical persisted current inputs, never installed. */
import {readFileSync,readdirSync,writeFileSync,existsSync,statfsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import * as bt from '../../lib/value/tests';import * as bv from '../../lib/value/valuation';
import * as st from '../../.audit/rules-5/sbc_once/lib/value/tests';import * as sv from '../../.audit/rules-5/sbc_once/lib/value/valuation';
import * as ct from '../../.audit/rules-5/current_scale/lib/value/tests';import * as cv from '../../.audit/rules-5/current_scale/lib/value/valuation';
import * as xt from '../../.audit/rules-5/combined/lib/value/tests';import * as xv from '../../.audit/rules-5/combined/lib/value/valuation';
import {qualityLtmAt,qualityLtmHistoryAt} from '../../lib/value/quality-ltm';
import {cachedQualityQuarters} from '../../lib/value/cached-quality-quarters';
import {latestBalanceAt} from '../../lib/value/latest-balance';
import {buyReturnInputs,ownerReturn} from '../../lib/value/owner-return';
import {publishedBuyPrice} from '../../lib/value/buy-price';
import {isInvestmentHolding} from '../../lib/value/investment-nav';
const corpus='/Users/miki/value-corpus',cutoff='2026-10-07';
const read=(rel:string)=>existsSync(corpus+'/'+rel)?JSON.parse(readFileSync(corpus+'/'+rel,'utf8')):null;
const prices=Object.assign({},...readdirSync(corpus+'/publish-repo/prices').map(f=>read('publish-repo/prices/'+f)));
const mask=(tests:any)=>['understandable','moat','economics','management','accounting'].map(k=>tests[k].numeric[0].toUpperCase()).join('');
const rows:any[]=[],errors:any[]=[];let n=0;
for(const file of readdirSync(corpus+'/publish-repo/dossiers').filter(f=>/^\d{3}\.json$/.test(f)))for(const d of Object.values(read('publish-repo/dossiers/'+file))as any[]){
 const inputs=read(`analysis/inputs/${d.id}.json`),f=read(`fundamentals/${d.id}.json`);if(!inputs?.memoYears?.length||!f){errors.push({id:d.id,reason:'missing persisted inputs'});continue;}
 try{
 const years=inputs.memoYears,qs=cachedQualityQuarters(d.id,read),qualityLtm=qualityLtmAt(qs,years,cutoff,f.splits),qualityLtmHistory=qualityLtmHistoryAt(qs,years,cutoff,f.splits,qualityLtm),currency=inputs.reportingCurrency??f.currency;
 const args={years,qualityLtm,qualityLtmHistory,kind:d.company.kind,industry:d.company.industry};
 const variants:any={};
 for(const [name,t,v]of [['baseline',bt,bv],['sbc_once',st,sv],['current_scale',ct,cv],['combined',xt,xv]]as const){
  const tests=t.runNumericTests(args),t5=mask(tests);
  const result=v.valueCompany({years,kind:d.company.kind,industry:d.company.industry,currency,bondYield:d.valuation?.bondYield??read('bonds/'+d.company.country+'.json')?.yield??null,cyclical:d.volatility==='volatile',qualityPass:t5==='PPPPP',cutoff,investmentHolding:isInvestmentHolding(d.company,years),currentCommonBalance:f.currentCommonBalance,currentShares:d.valuation?.shares??null,ttm:f.ttm,priceHistory:d.priceHistory,balance:latestBalanceAt(f.balanceSheets??[],cutoff,currency,years.at(-1),d.company.kind)});
  const val=result.valuation,fx=currency===d.company.currency?1:d.valuation?.perShareTrading?.fxRate;
  if(val&&d.valuation?.shares&&val.method==='owner_earnings'){
   const ratio=val.shares/d.valuation.shares;val.shares=d.valuation.shares;for(const k of ['low','mid','high']as const)val.perShare[k]*=ratio;
  }
  if(val&&fx)val.perShareTrading={currency:d.company.currency,fxRate:fx,low:val.perShare.low*fx,mid:val.perShare.mid*fx,high:val.perShare.high*fx};
  const range=val&&fx?[val.perShare.low*fx,val.perShare.mid*fx,val.perShare.high*fx]as[number,number,number]:null,mos=v.valuationMargin(val,d.volatility);
  const gate=publishedBuyPrice({st:d.status==='scored'?'s':'i',t:t5,v:range,m:mos,shareSources:d.valuation?.shareSources,businessChanged:d.thesis?.changed,buyReturnInputs:buyReturnInputs(val,d.company.currency)},prices[d.id]);
  variants[name]={quality:t5,buy:gate.b,priceResult:gate.result,valuation:val,range,mos,reason:result.reason,economics:tests.economics.metrics,qualityReasons:Object.fromEntries(Object.entries(tests).map(([k,t])=>[k,t.reasons])),expected:ownerReturn(val,d.company.currency,null,prices[d.id]?.[0]??null)?.expected??null};
 }
 const base=variants.baseline,liveMask=['understandable','moat','economics','management','accounting'].map(k=>d.tests[k].result[0].toUpperCase()).join('');
 const changes=Object.entries(variants).filter(([k,x]:any)=>k!=='baseline'&&(x.quality!==base.quality||JSON.stringify(x.range)!==JSON.stringify(base.range)||x.mos!==base.mos||x.buy!==base.buy));
 rows.push({id:d.id,name:d.company.name,quote:prices[d.id],live:{quality:liveMask,buy:d.b,value:d.valuation?.perShareTrading??d.valuation?.perShare,conversion:d.tests.economics.metrics.oeToNi},baselineMatchesLiveQuality:liveMask===base.quality,baselineMidDifference:base.range&&d.valuation?base.range[1]-(d.valuation.perShareTrading?.mid??d.valuation.perShare.mid):null,variants,changed:changes.map(([k])=>k)});
 }catch(e){errors.push({id:d.id,reason:String(e)});}
 for(const p of ['/','/Users/miki/data']){const s=statfsSync(p);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');}
 if(++n%250===0)console.log(n,'current identities');
}
writeFileSync('research/valuation/outputs/current-candidates.json.gz',gzipSync(JSON.stringify({basis:'same persisted current inputs; diagnostic, NOT release analysis; quarterly/balance refresh and publication corrections can differ from live',rows,errors})));console.log('DONE',rows.length,'errors',errors.length);
