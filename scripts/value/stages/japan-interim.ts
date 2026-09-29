import { cachedInterimDocuments, latestInterim, applyEdinetInterim } from '../../../lib/value/japan/cached-interim';
import { downloadCsv } from '../../../lib/value/japan/edinet';
import { parseEdinetCsv } from '../../../lib/value/japan/xbrl-csv';
import { readCorpusJson, readJsonl, writeCorpusJson } from '../../../lib/value/corpus';
import { readPriceHistory } from '../../../lib/value/price-history';
import type { Company, Fundamentals } from '../../../lib/value/types';

/** Reuses filing-day inventories; the only downloads are selected H1 CSVs. */
export default async function japanInterim({only,limit}:{only?:string[];limit?:number}):Promise<void> {
 const documents=cachedInterimDocuments();let written=0;const errors:string[]=[];
 const companies=readJsonl<Company>('universe.jsonl').filter(c=>c.source==='edinet'&&(!only||only.includes(c.id))).slice(0,limit);
 for(const company of companies) {
  const f=readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);if(!f)continue;
  const doc=latestInterim(f,documents.get(company.id)??[]);if(!doc)continue;
  try {
   const rows=(await downloadCsv(doc.docID)).flatMap(parseEdinetCsv);
   applyEdinetInterim(f,doc,rows,readPriceHistory(company.id));
   writeCorpusJson(`fundamentals/${company.id}.json`,f);
   if(++written%100===0)console.log(`japan-interim: ${written} processed`);
  } catch(error) {errors.push(company.id);console.error(`japan-interim: ${company.id}: ${error instanceof Error?error.message:String(error)}`);}
 }
 console.log(`japan-interim: ${written} processed, ${errors.length} failed`);
 if(errors.length)throw new Error(`Half-year filings failed: ${errors.join(', ')}`);
}
