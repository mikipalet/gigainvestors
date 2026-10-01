import {writeFileSync} from 'node:fs';
import {readCorpusJson} from '../../lib/value/corpus';
import type {Observation} from '../../lib/value/flags/types';
import type {FlagSource} from './stages/flags-fetch';
const reviewed:Record<string,Observation[]>={};
function observe(id:string,metric:string,value:number,fy:number,currency:string,start:string,end:string,section:string){
 const source=readCorpusJson<FlagSource>(`flags/sources/${id}.json`)!;const text=source.text.replace(/\s+/g,' ');start=start.replace(/\s+/g,' ');end=end.replace(/\s+/g,' ');const a=text.indexOf(start),b=text.indexOf(end,a+start.length);if(a<0||b<0)throw Error(`${id} observation bounds absent`);
 (reviewed[id]??=[]).push({metric,value,fy,currency,evidence:{quote:text.slice(a,b+end.length),url:source.url,filed:source.filed,section}});
}
// Values transcribed from the labelled columns in the original statements; no vendor estimates.
for(const [fy,cash]of [[2026,62556e6],[2025,43210e6]])observe('NVDA.US','cash',cash,fy,'USD','Jan 25, 2026 Jan 26, 2025','Year Ended','Liquidity table · USD millions');
for(const [fy,goodwill,equity]of [[2025,4787e6,798e6],[2024,4710e6,1545e6]]){
 observe('WKL.AS','goodwill',goodwill,fy,'EUR','Non-current assets\n\n2025\n\n2024','Total non-current assets','Consolidated balance sheet · EUR millions');
 observe('WKL.AS','equity',equity,fy,'EUR','Non-current assets\n\n2025\n\n2024','Total non-current assets','Consolidated balance sheet · EUR millions');
}
observe('CBG.LSE','adjusted-profit',144.3e6,2025,'GBP','Operating income 681.2','(122.4)', '2025 adjusted-to-statutory operating profit reconciliation · GBP millions');
observe('CBG.LSE','reported-profit',-122.4e6,2025,'GBP','Operating income 681.2','(122.4)', '2025 adjusted-to-statutory operating profit reconciliation · GBP millions');
observe('GE.2017','pension-deficit',(24624+4079)*1e6,2017,'USD','Projected benefit obligations\n\n$\n\n74,985','GE 2017 FORM 10-K 155','Pension funding: principal plus other plans · USD millions');
observe('CARILLION.2016','pension-deficit',804.8e6,2016,'GBP','pension obligation on an International Accounting Standard','longevity.','Pension obligations less assets · GBP millions');
observe('ORCL.US','uncommenced-leases',260e9,2026,'USD','As of May 31, 2026, we had $260 billion','September 2026.','Additional lease commitments not reflected on balance sheet');
observe('META.US','venture-uncommenced-leases',12.31e9,2025,'USD','We also entered into lease agreements with the Venture','no liability has been recorded.','Data-centre venture initial lease commitment');
observe('LULU.US','debt',0,2025,'USD','As of February 1, 2026, the Company had no borrowings outstanding','outstanding letters of credit and guarantee.','Revolving facilities: no borrowings; operating leases excluded');
observe('CARILLION.2016','goodwill',1571e6,2016,'GBP','At 31 December 2016, the Group had £1,571.0 million','largest single item included in its','Audit committee review: goodwill · GBP millions');
observe('CARILLION.2016','equity',729.9e6,2016,'GBP','Total equity 729.9','1,016.6','Consolidated balance sheet · GBP millions');
for(const [metric,value]of [['financial-guarantees',5.7e9],['credit-derivatives',16.9e9]] as const)observe('GOOGL.US',metric,value,2025,'USD','As of December 31, 2025, we provided backstops','included in Item 8 of this Annual Report on Form 10-K.','Maximum future payments: financial guarantees plus credit derivatives');
observe('LULU.US','cash',1807202e3,2025,'USD','Cash and cash equivalents $ 1,807,202 $ 1,984,336','Inventories','Balance sheet cash · USD thousands');
writeFileSync('lib/value/flags/reviewed-observations.json',JSON.stringify(reviewed,null,2)+'\n');console.log(Object.keys(reviewed));
