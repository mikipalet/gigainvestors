import { importIndia } from '../../../lib/value/india/importer';

/** Fundamentals only. No company/universe writes, analysis, or publication. */
export default async function india(options:{only?:string[];force?:boolean}):Promise<void>{
  await importIndia(options);
}
