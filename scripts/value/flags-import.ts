import {createHash} from 'node:crypto';
import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {fetchDocument,diskGuard} from '../../lib/value/thesis/sources';
import {htmlToText} from '../../lib/value/reports/html-to-text';
const imports=[
 ['CBG.LSE','https://www.closebrothers.com/system/files/rrp/reports/CBGAnnualReport2025.pdf','2025-10-03','2025-07-31'],
 ['VALEANT.2015','https://www.sec.gov/Archives/edgar/data/885590/000088559016000101/valeant2015form10-k.htm','2016-04-29','2015-12-31'],
 ['GE.2017','https://www.sec.gov/Archives/edgar/data/40545/000004054518000014/ge10-k2017.htm','2018-02-23','2017-12-31'],
 ['LUCKIN.2019','https://www.sec.gov/Archives/edgar/data/1767582/000104746919003174/a2238747z424b4.htm','2019-05-17','2018-12-31'],
 ['WIRECARD.2018','https://wirecard.com/wp-content/uploads/2020/12/Annual-Report-2018.pdf','2019-04-25','2018-12-31'],
 ['CARILLION.2016','https://www.petercrow.com/storage/12406/a1926d75-5407-4a05-872b-9300cd8ebd5e/0930aq-carillion-annual-report-2016-original.pdf','2017-03-01','2016-12-31'],
];
async function main(){for(const [id,url,filed,period]of imports){diskGuard();if(readCorpusJson(`flags/sources/${id}.json`)){console.log(id,'cached');continue;}try{const raw=await fetchDocument(url),html=/<html|<body|<ix:/i.test(raw)?raw:undefined,text=html?htmlToText(html):raw;if(text.length<3000)throw Error('Short body');writeCorpusJson(`flags/sources/${id}.json`,{url,filed,period,text,html,hash:createHash('sha256').update(raw).digest('hex')});console.log(id,text.length);}catch(e){console.log(id,e instanceof Error?e.message:'failed');if(String(e).includes('DISK STOP'))throw e;}}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
