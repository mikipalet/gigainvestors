import {readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {readCorpusJson} from '../../../../lib/value/corpus';
import {parseYahooHistory,readPriceHistory} from '../../../../lib/value/price-history';
import {reconcileShares,type ShareCheck} from '../../../../lib/value/share-check';
import {shardOf} from '../../../../lib/value/shard';
import type {Dossier} from '../../../../lib/value/types';
const root=process.argv[2];
const ids=JSON.parse(readFileSync(`${root}/share-control-inputs.json`,'utf8')).removedScheduledShareChecks as string[];
const shares=ids.map(id=>{
 const saved=readCorpusJson<ShareCheck>(`enrichment-v7/share-checks/${id}.json`)!;
 const replay=reconcileShares(saved.observations);
 return {id,checkedAt:saved.checkedAt,shares:saved.shares,replayedShares:replay.shares,independentReconciliationMatches:saved.status===replay.status&&saved.shares===replay.shares};
});
const histories=['ITUB.US','HEI-A.US'].map(id=>{
 const file=`/Users/miki/data/value-cover/held-validation/cover-4/raw/${id}-yahoo-1mo.json`;
 const raw=JSON.parse(readFileSync(file,'utf8'));
 const reviewed=parseYahooHistory(raw);
 const live=readCorpusJson<Record<string,Dossier>>(`publish-repo/dossiers/${shardOf(id)}.json`)![id].priceHistory;
 return {id,source:file,priceDate:new Date(raw.chart.result[0].meta.regularMarketTime*1000).toISOString(),months:reviewed.length,rawSourceMatchesLive:isDeepStrictEqual(reviewed,live),fixedReaderMatchesSource:isDeepStrictEqual(readPriceHistory(id),reviewed)};
});
writeFileSync(`${root}/source-proof.json`,JSON.stringify({shares,histories},null,2)+'\n');
console.log(JSON.stringify({shareChecks:shares.length,shareFailures:shares.filter(x=>!x.independentReconciliationMatches),histories},null,2));
if(shares.some(x=>!x.independentReconciliationMatches)||histories.some(x=>!x.rawSourceMatchesLive||!x.fixedReaderMatchesSource))process.exitCode=1;
