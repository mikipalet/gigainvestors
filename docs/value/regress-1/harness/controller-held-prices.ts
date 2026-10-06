/** Controller-only release step. Never run by the regression proof. */
import {readFileSync} from 'node:fs';
import {readCorpusJson} from '../../../../lib/value/corpus';
import {refreshPrices,commitPrices,freshPrice} from '../../../../scripts/value/stages/prices';
import {withPublishRepository,pushRepository} from '../../../../scripts/value/stages/publish';
import {uploadPublishedSnapshot} from '../../../../scripts/value/blob-publish';
import type {Company,PriceMap} from '../../../../lib/value/types';
const bundle=process.argv[2];
async function main(){
 const manifest=JSON.parse(readFileSync(bundle+'/manifest.json','utf8'));
 if(manifest.status!=='READY')throw Error('Bundle is NOT approved');
 const quotes=JSON.parse(readFileSync(bundle+'/held-quotes.json','utf8'))as PriceMap;
 if(Object.values(quotes).some(q=>q[2]==='seed'||!freshPrice(q)))throw Error('Reviewed quotes expired; repeat the price/release proof');
 const companies=Object.keys(quotes).map(id=>{const c=readCorpusJson<Company>(`companies/${id}.json`);if(!c)throw Error(`Missing company ${id}`);return c;});
 await withPublishRepository(async repo=>{
  const result=await refreshPrices({repo,companies,bulk:async()=>[],yahoo:async c=>[quotes[c.id][0],quotes[c.id][1]]});
  if(!result.ok)throw Error('Reviewed quote staging incomplete');
  commitPrices({repo,asOf:new Date().toISOString().slice(0,10)});
  pushRepository(repo,false);
  await uploadPublishedSnapshot(repo);
 });
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
