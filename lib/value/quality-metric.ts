import type { Kind } from './types';
export type QualityMetric={label:'ROIC'|'ROTE'|'ROE';value:number|'unlimited';basis?:'including-acquisitions'};
/** The moat's legacy roeMedian field measures return on tangible equity. */
export function qualityMetric(kind:Kind,metrics:Record<string,number|null>):QualityMetric|undefined{
 const financial=kind!=='operating';
 const value=financial?metrics.roteMedian??metrics.roeMedian:metrics.totalRoicMedian;
 const label=financial?(metrics.tangibleReturn===0?'ROE':'ROTE'):'ROIC';
 if(!financial)return value!=null&&Number.isFinite(value)?{label,value,basis:'including-acquisitions'}:undefined;
 if(value===1.000001||value===Infinity||(value==null&&(metrics.unlimitedYears??0)>=5))return {label,value:'unlimited'};
 if(value==null||!Number.isFinite(value))return;
 return {label,value};
}
