import {publicBusiness} from '../../lib/value/flags/public';
import {businessLines} from '../../lib/value/flags/presentation';
import {shardOf} from '../../lib/value/shard';
import {readFileSync,writeFileSync} from 'node:fs';
import type {Analysis} from '../../lib/value/types';
const ids=['KO.US','AAPL.US','GOOGL.US','MSFT.US','ORCL.US','META.US','NVDA.US','LULU.US','WKL.AS','ACN.US','JPM.US','CBG.LSE','AXP.US','BRK-B.US','7203.JP'];
const data=ids.map(id=>{const a:Analysis=JSON.parse(readFileSync(`.integrate/staging/store/dossiers/${shardOf(id)}.json`,'utf8'))[id];const depth=publicBusiness(a.businessDepth,a);return {id,flags:depth?.flags??[],relationships:depth?.relationships??[],lines:businessLines(a)};});
writeFileSync('.integrate/staging/review-flags.json',JSON.stringify(data,null,2));for(const r of data)console.log(r.id,r.flags.map(f=>`${f.tone}: ${f.label}`).join('; ')||'No supported material flags');
