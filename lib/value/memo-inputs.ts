import {createHash} from 'node:crypto';
import type {Analysis,Year} from './types';

/** A source refresh must go through analysis before it can change its memo. */
export function memoStatementYears(a:Analysis,inputs:{asOf:string;memoYears?:Year[]}|null):Year[]|undefined {
 return inputs?.asOf===a.asOf ? inputs.memoYears : undefined;
}

/** Generated timestamps and the previous output are not research inputs. */
export function memoInputHash(input:Record<string,unknown>&{analysis:unknown}):string {
 const {asOf: _asOf,ownerMemo: _memo,...analysis}=input.analysis as Analysis;
 return createHash('sha256').update(JSON.stringify({...input,analysis})).digest('hex');
}
