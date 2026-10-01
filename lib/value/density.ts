import type {Series} from './types';
/** Latest ten fiscal years, without bridging missing observations or claiming ten reports. */
export function seriesSummary(series:Series,better:'higher'|'lower') {
 const end=Math.max(...series.map(([year])=>year));
 const points=series.filter((p):p is [number,number]=>p[0]>end-10&&p[1]!==null&&Number.isFinite(p[1])).sort((a,b)=>a[0]-b[0]);
 if(!points.length)return null;
 const values=points.map(p=>p[1]).sort((a,b)=>a-b),middle=Math.floor(values.length/2);
 return {first:points[0][0],last:points.at(-1)![0],years:points.length,median:values.length%2?values[middle]:(values[middle-1]+values[middle])/2,worst:better==='higher'?values[0]:values.at(-1)!,latest:points.at(-1)![1]};
}
