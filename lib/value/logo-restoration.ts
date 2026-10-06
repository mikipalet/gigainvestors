import {isDeepStrictEqual} from 'node:util';
import recovery from './logo-restorations.json';

/** Historical publication evidence, not a new identity approval. A changed cache
 * (including a later rejection) cannot inherit this narrowly scoped recovery. */
export function restoredPublishedLogo(id:string,cache:unknown):string|null {
 const entry=(recovery.entries as Record<string,{logo:string;cache:unknown}>)[id];
 return entry&&isDeepStrictEqual(cache,entry.cache)?entry.logo:null;
}
