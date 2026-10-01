import dotenv from 'dotenv';
import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {recordBusinessReading} from '../../lib/value/business/recordings';
import {readFileSync,existsSync} from 'node:fs';
import {corpusPath} from '../../lib/value/corpus';
import {selectMemo,MEMO_READER_VERSION,type SpanCandidate} from '../../lib/value/business/read';
import type {Analysis} from '../../lib/value/types';
import {askJev} from '../../lib/value/jev/client';
// Owner-memo challenge labels reviewed against these actual, cached issuer passages.
// Deliberately include incomplete/irrelevant spans that fooled the first selector.
const cases:Array<[string,number,string,boolean]>=[
 ['GOOGL.US',1,'more than 70% of total revenues from online advertising in 2025.',true],
 ['GOOGL.US',1,'International revenues accounted for approximately 52% of consolidated revenues in 2025.',true],
 ['WKL.AS',1,'In 2025, 83% of our total revenues were recurring (2024: 82%).',true],
 ['LULU.US',1,'Company-operated store net revenue increased 1% and e-commerce net revenue increased 8%.',true],
 ['MSFT.US',1,'Microsoft is a major investor in OpenAI',false],
 ['MSFT.US',1,'Productivity and Business Processes revenue increased driven by Microsoft 365 Commercial cloud.',true],
 ['ADBE.US',1,'Firefly Standard, Firefly Pro and Firefly Premium.',true],
 ['KO.US',6,'PepsiCo, Inc. is a primary competitor.',true],
 ['RACE.MI',6,'Our revenues from Formula 1 activities may decline',true],
 ['WKL.AS',2,'subscription-based expert solutions and subscription-based services remained above 90%.',true],
 ['LULU.US',6,'negative publicity, regulatory investigations, or lawsuits filed against us. 10 Table of',false],
 ['GOOGL.US',5,'As of December 31, 2025, Larry Page and Sergey Brin beneficially owned',false],
 ['LULU.US',1,"During 2025, our women's, men's, and accessories and other categories represented 63%,",false],
 ['ADBE.US',4,'to payments for our common stock repurchases and repayment of our 1.90%',false],
 ['GOOGL.US',4,'•Repurchases of Class A and Class C shares were $6.5 billion and',false],
 ['KO.US',5,'As of February 18, 2026, there were 168,055 shareowner accounts of record.',false],
 ['WKL.AS',3,'Over the years, we increased it to 11% of revenues.',false],
 ['ASML.AS',3,'At the end of 2025, prices of Memory increased',false],
 ['GOOGL.US',2,'International revenues accounted for approximately 52% of consolidated revenues in 2025.',false],
 ['LULU.US',5,'Company-operated store net revenue increased 1% and e-commerce net revenue increased 8%.',false],
];
async function main(){
 dotenv.config({path:'.env.local',quiet:true});dotenv.config({path:'/Users/miki/value-corpus/.env.local',quiet:true});
 const results=[];
 // Regression cases come from this round's manual review, not a holdout.
 for(const [id,question,span] of [
  ['AAPL.US',6,'Form 10-K | 7 B cant competition as competitors imitate the Company’s'],
  ['MSFT.US',6,'Security offerings compete with products from a range of competitors including identity'],
  ['ACN.US',6,'(3) Operational Risks'],
  ['JPM.US',1,'(in millions) 2023 Noninterest revenue $ 65,816 Net interest income 90,856 Net'],
  ['BRK-B.US',6,'Nuclear Regulatory Commission pursuant to the Atomic Energy Act of 1954, as'],
  ['CBG.LSE',4,'pay a final dividend on its ordinary shares for the 2025 financial'],
  ['CBG.LSE',6,'to Marex is expected to complete in early 2026, subject to regulatory'],
 ] as Array<[string,number,string]>)cases.push([id,question,span,false]);
 for(const [id,question,span,expected]of cases){
  const a=readCorpusJson<Analysis>(`analysis/${id}.json`)!;
  const cached=readCorpusJson<{text:string;url:string;filed:string}>(`flags/sources/${id}.json`)??readCorpusJson<{text:string;url:string;filed:string}>(`judgement/sources/${id}.json`);
  const text=(cached?.text??a.report.sections.flatMap(s=>{const p=corpusPath(`reports/${id}/${s}.txt`);return existsSync(p)?[readFileSync(p,'utf8')]:[];}).join('\n')).replace(/\s+/g,' ');
  const at=text.indexOf(span);if(at<0){results.push({id,question,span,expected,sourceMatch:false,accepted:false,correct:false});continue;}
  const quote=text.slice(Math.max(0,at-160),at+span.length+180);
  const candidate:SpanCandidate={question,span,names:['Google','OpenAI','Microsoft','Firefly','PepsiCo','Formula 1'],source:{text:quote,quote,url:cached?.url??a.report.url!,filed:cached?.filed??a.report.filed!,section:'Annual filing'}};
  const answers=await selectMemo([candidate],async input=>{const result=await askJev({...input,usageFile:'business-backfill/calibration-usage.jsonl'});recordBusinessReading('real-calibration-recordings',{id,...input,...result});return result;});
  results.push({id,question,span,quote,expected,sourceMatch:true,accepted:!!answers.length,correct:expected===!!answers.length});
 }
 const accuracy=results.filter(r=>r.correct).length/results.length;
 writeCorpusJson('business-backfill/calibration.json',{version:MEMO_READER_VERSION,accuracy,n:results.length,realCases:results.filter(r=>r.sourceMatch).length,positive:cases.filter(c=>c[3]).length,negative:cases.filter(c=>!c[3]).length,scope:'Reviewed filing regression set, used during development; not an independent holdout. Numeric facts require independent checking.',results});
 console.log(JSON.stringify({accuracy,n:results.length,results},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
