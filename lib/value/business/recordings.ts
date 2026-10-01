import {appendFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {corpusPath} from '../corpus';
import {businessDiskGuard} from './disk';
/** Concatenated gzip members remain stream-readable without a raw text file. */
export function recordBusinessReading(file:string,value:unknown):void {
 businessDiskGuard();
 const target=corpusPath(`business-backfill/${file}.jsonl.gz`);
 mkdirSync(path.dirname(target),{recursive:true});
 appendFileSync(target,gzipSync(JSON.stringify(value)+'\n'));
}
