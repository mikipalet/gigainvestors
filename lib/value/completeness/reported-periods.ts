import type {Year} from '../types';

/** A vendor dates PTSB's December annual series in the following June.
 * Require both issuer-reported comparative fingerprints before correcting it;
 * this is not a general fiscal-calendar inference. */
export function restoreReportedPeriods(id:string,years:Year[]):Year[]{
 if(id==='OCA.AU')return years.map(y=>{
  if(y.fy<2021||!y.end.endsWith('-05-31'))return y;
  return {...y,end:`${y.fy}-03-31`,provenance:{...y.provenance,end:{source:'https://oceaniahealthcare.co.nz/investor-centre/reports-presentations/',field:'annual reporting period',method:'reported' as const,inputs:['From 2021 our balance date is 31 March. Prior to 2021 our balance date was 31 May.']}}};
 });
 if(id==='PYIYF.US'){
  const anchors=[['2024-12-31',106022000,2186827000],['2025-12-31',77725000,2320457000]] as const;
  if(!anchors.every(([end,netIncome,totalAssets])=>years.some(y=>(y.end===end||y.end===`${Number(end.slice(0,4))+1}-06-30`)&&y.currency==='NZD'&&y.netIncome===netIncome&&y.totalAssets===totalAssets)))return years;
  const source='https://www.cms.propertyforindustry.co.nz/wp-content/uploads/2026/08/5-2026-06-30-PFI-Annual-Report-12ME-30-June-2026.pdf';
  return years.filter(y=>!anchors.some(([end,ni,assets])=>y.end===end&&y.netIncome===ni&&y.totalAssets===assets&&years.some(correct=>correct.end===`${Number(end.slice(0,4))+1}-06-30`&&correct.netIncome===ni&&correct.totalAssets===assets))).map(y=>{
   if(!anchors.some(([end])=>end===y.end))return y;
   const fy=Number(y.end.slice(0,4))+1,end=`${fy}-06-30`;
   return {...y,fy,end,provenance:{...y.provenance,end:{source,field:'annual reporting period',method:'derived' as const,inputs:[`Provider date: ${y.end}`,'FY2026/2025 profit NZ$77.725m/106.022m and assets NZ$2320.457m/2186.827m. The 2024 transition was a six-month period.']}}};
  });
 }
 if(id==='KAR.AU'){
  const anchors=[['2025-06-30',127.5e6,776.5e6],['2026-06-30',125.5e6,628.6e6]] as const;
  if(!anchors.every(([end,netIncome,revenue])=>years.some(y=>y.end===end&&y.currency==='USD'&&y.netIncome===netIncome&&y.revenue===revenue)))return years;
  const source='https://www.karoonenergy.com.au/wp-content/uploads/260226-Karoon-2025-Annual-Report.pdf';
  return years.filter(y=>!anchors.some(([end,ni,assets])=>y.end===end&&y.netIncome===ni&&y.totalAssets===assets&&years.some(correct=>correct.end===`${Number(end.slice(0,4))+1}-06-30`&&correct.netIncome===ni&&correct.totalAssets===assets))).map(y=>{
   if(!anchors.some(([end])=>end===y.end))return y;
   const fy=y.fy-1,end=`${fy}-12-31`;
   return {...y,fy,end,provenance:{...y.provenance,end:{source,field:'annual reporting period',method:'derived' as const,inputs:[`Provider date: ${y.end}`,'2025/2024 statutory net profit US$125.5m/127.5m; revenue US$628.6m/776.5m. Earlier June fiscal periods remain unchanged.']}}};
  });
 }
 if(id!=='PTSB.IR')return years;
 const anchors=[['2025-06-30',162e6,28932e6],['2026-06-30',114e6,30465e6]] as const;
 if(!anchors.every(([end,netIncome,totalAssets])=>years.some(y=>y.end===end&&y.currency==='EUR'&&y.netIncome===netIncome&&y.totalAssets===totalAssets)))return years;
 const source='https://www.permanenttsbgroup.ie/~/media/Files/P/Ptsb-CORP/documents/result-centre/annual-interim/2025/ptsbgh-annual-report-2025.pdf';
 return years.map(y=>{
  if(!y.end.endsWith('-06-30'))return y;
  const fy=Number(y.end.slice(0,4))-1,end=`${fy}-12-31`;
  return {...y,fy,end,provenance:{...y.provenance,end:{source,field:'annual reporting period',method:'derived' as const,inputs:[`Provider date: ${y.end}`, 'Year ended 31 December 2025 / 2024: profit for the year 114 / 162; total assets 30,465 / 28,932 (EUR million).', 'The two consecutive issuer comparatives establish the vendor annual-series date offset.']}}};
 });
}
