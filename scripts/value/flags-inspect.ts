import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {inlineObservations} from '../../lib/value/flags/inline';
import {computeFlags} from '../../lib/value/flags/compute';
import {FLAG_COMPANIES,type FlagSource} from './stages/flags-fetch';
import {diskGuard} from '../../lib/value/thesis/sources';
for(const id of FLAG_COMPANIES){const s=readCorpusJson<FlagSource>(`flags/sources/${id}.json`);if(!s?.html)continue;diskGuard();const o=inlineObservations(s.html,s);writeCorpusJson(`flags/observations/${id}.json`,o);console.log(id,o.length,computeFlags(o).map(f=>f.label));}
