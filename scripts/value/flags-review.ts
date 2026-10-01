/** Reproducible import of the source passages manually inspected for flags-1. */
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {readCorpusJson,corpusPath} from '../../lib/value/corpus';
import {extractionVersion} from '../../lib/value/flags/questions';
import type {FlagSource} from './stages/flags-fetch';
import {quantities} from '../../lib/value/flags/extract';
const recordings=readdirSync(corpusPath('flags/extractions')).map(f=>JSON.parse(readFileSync(corpusPath('flags/extractions',f),'utf8')));
const reviews:unknown[]=[];
function review(company:string,pattern:RegExp,signal:string,quantityText?:string,counterparty?:string,metric='none'){
 const source=readCorpusJson<FlagSource>(`flags/sources/${company}.json`)!;
 const quote=source.text.split(/\n\s*\n/).find(b=>pattern.test(b))?.trim();if(!quote)throw Error(`${company}: review passage not found ${pattern}`);
 const topic=counterparty?'relationship':'signal';
 const original=recordings.find(r=>r.company===company&&r.topic===topic&&(!counterparty||r.counterparty===counterparty)&&r.evidence.quote.includes(quote.slice(0,150)));
 // A manually checked quantity is not a model confidence claim; preserve the original confidence.
 const quantity=quantityText?quantities(quote).find(q=>q.text===quantityText):undefined;
 if(quantityText&&!quantity)throw Error(`${company}: quantity ${quantityText} not verbatim`);
 reviews.push({company,topic,counterparty,sourceHash:source.hash,reviewedAt:'2026-10-01',review:'Manually checked against the complete linked filing; classification, direction and selected quantity checked separately.',evidence:{quote,url:source.url,filed:source.filed,period:source.period,section:'Annual filing'},result:{...(counterparty?{relation:signal,quantityConfidence:original?.quantityConfidence??0,metric}:{signal}),quantity,version:extractionVersion(topic),confidence:original?.confidence??0,recording:original?.recording??{state:'Manual filing review',questions:{},answers:{}}}});
}
review('GE.2017',/^Indemnification Agreements – Continuing Operations/,'residual_guarantee','$246 million');
review('META.US',/residual value guarantees \(RVG\)/,'residual_guarantee','$28 billion');
review('MSFT.US',/As an equity method investee, OpenAI is a related party/,'related_party','$24.1 billion');
review('LULU.US',/^•Fabrics/,'supplier_concentration','20%');
review('SWKS.US',/^During fiscal 2025, fiscal 2024, and fiscal 2023, Apple/,'customer_concentration','67%');
review('NVDA.US',/We utilize foundries, such as Taiwan Semiconductor/,'supplier',undefined,'TSMC');
review('NVDA.US',/We utilize foundries, such as Taiwan Semiconductor/,'supplier',undefined,'Samsung Electronics');
review('NVDA.US',/We purchase memory from SK Hynix/,'supplier',undefined,'SK hynix');
review('NVDA.US',/We purchase memory from SK Hynix/,'supplier',undefined,'Micron');
review('CRWV.US',/We recognized an aggregate of approximately 67%/,'customer','67%','Microsoft','revenue');
review('CRWV.US',/^Although we currently generate the majority/,'customer','$11.9 billion','OpenAI','amount');
review('CRWV.US',/^Although we currently generate the majority/,'customer',undefined,'Meta');
review('SWKS.US',/^During fiscal 2025, fiscal 2024, and fiscal 2023, Apple/,'customer','67%','Apple','revenue');
review('QCOM.US',/revenues from Apple, Samsung and Xiaomi each comprised/,'customer',undefined,'Apple');
review('QCOM.US',/revenues from Apple, Samsung and Xiaomi each comprised/,'customer',undefined,'Samsung Electronics');
review('QCOM.US',/revenues from Apple, Samsung and Xiaomi each comprised/,'customer',undefined,'Xiaomi');
review('AMZN.US',/^As of December 31, 2025, our recorded value in equity/,'stake',undefined,'Anthropic');
review('AMZN.US',/^As of December 31, 2025, our recorded value in equity/,'stake',undefined,'Rivian');
review('MSFT.US',/As an equity method investee, OpenAI is a related party/,'stake','25%','OpenAI','ownership');
review('AMD.US',/^We utilize Taiwan Semiconductor/,'supplier',undefined,'TSMC');
review('AMD.US',/^In October 2025, we entered into a product purchase agreement with OpenAI/,'customer',undefined,'OpenAI');
review('AVGO.US',/^We focus on maintaining an efficient global supply chain/,'supplier',undefined,'TSMC');
review('AVGO.US',/^We focus on maintaining an efficient global supply chain/,'supplier',undefined,'Hon Hai');
writeFileSync('lib/value/flags/reviewed.json',JSON.stringify(reviews,null,2)+'\n');console.log(`${reviews.length} source-specific reviews (${reviews.filter((r:any)=>r.topic==='relationship').length} edges)`);
