/** Persist the same reviewed corrections consumed by fetch and analysis. Offline only. */
import os from 'node:os';
import path from 'node:path';
import {statfsSync} from 'node:fs';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {correctCachedAnnualSources,correctCachedTrailingSources} from '../../../lib/value/annual-source-corrections';
import type {Company,Fundamentals} from '../../../lib/value/types';
const root=path.join(os.homedir(),'data/value-holds');
if(process.env.VALUE_CORPUS_DIR!==path.join(root,'corpus'))throw Error('Private corpus required');
for(const volume of ['/',root]){const s=statfsSync(volume);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit');}
for(const id of (process.env.VALUE_ONLY??'').split(',').filter(Boolean)){
 const c=readCorpusJson<Company>(`companies/${id}.json`)!,f=readCorpusJson<Fundamentals>(`fundamentals/${id}.json`)!;
 f.years=correctCachedAnnualSources(c,f.years,readCorpusJson(`raw/eodhd/${id}.json`),readCorpusJson,f.splits);
 f.ttm=correctCachedTrailingSources(id,f.ttm,readCorpusJson);
 writeCorpusJson(`fundamentals/${id}.json`,f);
}
