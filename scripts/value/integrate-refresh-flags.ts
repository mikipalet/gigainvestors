import {readFileSync} from 'node:fs';
import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {dividendStrength,pricingStrength} from '../../lib/value/flags/strengths';
import {diskGuard} from '../../lib/value/thesis/sources';
import type {FlagRecord} from '../../lib/value/flags/types';
import type {FlagSource} from './stages/flags-fetch';
for(const {id} of JSON.parse(readFileSync('.integrate/staging/inventory.json','utf8')).entries){
 diskGuard();const r=readCorpusJson<FlagRecord>(`flags/${id}.json`),s=readCorpusJson<FlagSource>(`flags/sources/${id}.json`);if(!r||!s)continue;
 const retained=r.flags.filter(f=>f.kind!=='dividend-growth'&&f.extraction!=='judgement');
 const strengths=[...dividendStrength({...s,quote:'',section:'Annual filing'}),...pricingStrength(readCorpusJson<any>(`analysis/${id}.json`)!)];
 r.flags=[...retained,...strengths.filter(f=>!retained.some(old=>old.kind===f.kind))];writeCorpusJson(`flags/${id}.json`,r);
}
