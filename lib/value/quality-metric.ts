import type { Kind } from './types';
export type QualityMetric={label:'ROIC'|'ROTE'|'ROE';value:number|'unlimited'};
/** The moat's legacy roeMedian field measures return on tangible equity. */
export function qualityMetric(kind:Kind,metrics:Record<string,number|null>):QualityMetric|undefined{
 const financial=kind!=='operating';
 const value=financial?metrics.roteMedian??metrics.roeMedian:metrics.roicMedian;
 const label=financial?(metrics.tangibleReturn===0?'ROE':'ROTE'):'ROIC';
 if(value===1.000001||value===Infinity||(value==null&&(metrics.unlimitedYears??0)>=5))return {label,value:'unlimited'};
 if(value==null||!Number.isFinite(value))return;
 return {label,value};
}
