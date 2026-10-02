/** Dated market-price references for dossiers with no financial denominator. */
import dotenv from 'dotenv';
import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {parseYahooPrice} from '../../lib/value/prices-yahoo';
import {yahooSymbol} from '../../lib/value/price-history';
import {businessDiskGuard} from '../../lib/value/business/disk';
import type {Analysis} from '../../lib/value/types';
import type {MemoFacts} from '../../lib/value/owner-memo';
dotenv.config({path:'.env.local',quiet:true});
async function main(){
 for(const id of ['543A.JP','457190.KO','TKMS.XETRA','GNZ.NZ']){
  businessDiskGuard();const a=readCorpusJson<Analysis>(`analysis/${id}.json`)!;
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(a.company))}?range=5d&interval=1d`;
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)});if(!r.ok){console.log(`${id}: HTTP ${r.status}`);continue;}
  const raw=await r.json(),meta=raw.chart?.result?.[0]?.meta,quote=parseYahooPrice(raw),high=meta?.fiftyTwoWeekHigh;
  if(meta?.currency!==a.company.currency||typeof high!=='number'||!Number.isFinite(high)||high<=0||Date.now()-Date.parse(quote[1])>7*86400000){console.log(`${id}: rejected reference`);continue;}
  const file=`business-backfill/facts/${id}.json`,facts=readCorpusJson<MemoFacts>(file)??{};
  writeCorpusJson(file,{...facts,priceReference:{value:high,currency:meta.currency,asOf:quote[1],evidence:{url,filed:quote[1],section:'52-week market price range',quote:`Yahoo ${meta.symbol}: 52-week high ${high} ${meta.currency}; completed close ${quote[0]} on ${quote[1]}.`}}});
  console.log(`${id}: dated 52-week comparison saved`);
 }
 // The same ordinary share remains listed in Madrid after Amsterdam delisting.
 const id='FER.AS',a=readCorpusJson<Analysis>(`analysis/${id}.json`)!;
 if(a.company.isin!=='NL0015001FS8'||a.company.currency!=='EUR'||!a.company.listings.includes('FER.MC'))throw Error('Ferrovial share identity changed');
 const url='https://query1.finance.yahoo.com/v8/finance/chart/FER.MC?range=5d&interval=1d';
 const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)});
 if(r.ok){const raw=await r.json(),meta=raw.chart?.result?.[0]?.meta,quote=parseYahooPrice(raw);
  if(meta?.currency==='EUR'&&Date.now()-Date.parse(quote[1])<=7*86400000){const file=`business-backfill/facts/${id}.json`;writeCorpusJson(file,{...readCorpusJson<MemoFacts>(file),priceQuote:{quote,label:'Madrid',evidence:{url:'https://www.sec.gov/Archives/edgar/data/1468522/000146852226000062/delistingeffectiveness.htm',filed:'2026-09-11',section:'Same ordinary shares, Madrid listing',quote:`Amsterdam trading ceased September 11, 2026. The same ordinary shares remain listed in Spain and on Nasdaq. ISIN NL0015001FS8; FER.MC close ${quote[0]} EUR on ${quote[1]}; quote source ${url}.`}}});console.log('FER.AS: verified same-share Madrid quote saved');}
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Reference repair failed');process.exitCode=1;});
