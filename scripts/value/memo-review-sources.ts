/** Bounded local filing-text refresh for the twenty owner-review dossiers. */
import dotenv from 'dotenv';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {corpusPath,readCorpusJson} from '../../lib/value/corpus';
import {fetchDocument} from '../../lib/value/thesis/sources';
import {htmlToText} from '../../lib/value/reports/html-to-text';
import {businessDiskGuard} from '../../lib/value/business/disk';
import type {Analysis} from '../../lib/value/types';
import type {Source} from '../../lib/value/judgement/read';
dotenv.config({path:'.env.local',quiet:true});
const ids=['LULU.US','ADBE.US','GOOGL.US','KO.US','AAPL.US','MSFT.US','WKL.AS','ACN.US','JPM.US','BRK-B.US','7203.JP','6758.JP','RIGD.LSE','0700.HK','005930.KO','RACE.MI','NESN.SW','MC.PA','ASML.AS','CBG.LSE'];
const extra:Record<string,string>={
 '0700.HK':'https://static.www.tencent.com/uploads/2026/04/09/62d786fcf3d3c8cb7e54791ee95439ac.pdf',
 'NESN.SW':'https://www.nestle.com/sites/default/files/2026-02/annual-review-2025-en.pdf',
 '005930.KO':'https://images.samsung.com/is/content/samsung/assets/global/ir/docs/2025_4Q_Interim_Report.pdf',
 'RIGD.LSE':'https://www.ril.com/ar2025-26/pdf/07_RIL_IAR_2025-26_Consolidated_22-05-26.pdf',
};
async function main(){for(const id of ids){
 businessDiskGuard();const file=corpusPath(`business-backfill/memo-sources/${id}.json.gz`);if(existsSync(file))continue;
 const a=readCorpusJson<Analysis>(`analysis/${id}.json`)!;
 const cache=corpusPath(`business-backfill/sections-v2/${id}.json.gz`);
 const sources:Source[]=existsSync(cache)?JSON.parse(gunzipSync(readFileSync(cache)).toString()):[];
 const url=extra[id]??a.report.url??sources[0]?.url;
 if(!url){console.log(`${id}: needs annual source`);continue;}
 try{const raw=await fetchDocument(url);const text=/<(?:html|body|div|p)[ >]/i.test(raw)?htmlToText(raw):raw;
  if(text.length>4_000_000)throw Error('text exceeds 4 MB cap');
  const source:Source={url,text,quote:'',section:'Annual filing',filed:a.report.filed??sources[0]?.filed??'',period:a.report.period??sources[0]?.period??null};
  businessDiskGuard();mkdirSync(corpusPath('business-backfill/memo-sources'),{recursive:true});writeFileSync(file,gzipSync(JSON.stringify([source])));console.log(`${id}: ${text.length} characters`);
 }catch(e){if(String(e).includes('DISK STOP'))throw e;console.log(`${id}: ${e instanceof Error?e.message:'fetch failed'}`);}
}}
main().catch(e=>{console.error(e instanceof Error?e.message:'failed');process.exitCode=1;});
