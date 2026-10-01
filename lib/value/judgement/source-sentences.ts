import {validShortText} from './short-text';
/** Literal short clauses broaden the editorial menu beyond the original ten examples.
 * Jev must still select and independently validate the complete sentence. */
export function sourceSentences(quote:string):string[]{
 const sentences=quote.replace(/\b(?:[A-Z]\.\s*){2,}/g,m=>m.replaceAll('.','').trim()+' ').replace(/\b(?:Inc|Corp|Ltd|Co)\./g,m=>m.slice(0,-1)).split(/(?<=[.!?])\s+|\n+/);
 const options=sentences.flatMap(s=>{
  const clean=s.replace(/\s+/g,' ').trim();
  const lead=clean.split(/;|,\s+(?:and |as well as |including |such as )/)[0];
  const predicate=clean.match(/\b(?:provides|offers|sells|makes|manufactures|operates|develops|distributes|designs|produces|serves|supplies|speciali[sz]es|engages)\b/i);
  const core=predicate?`The company ${clean.slice(predicate.index)}`:clean;
  return [clean,lead,core].map(t=>/[.!?]$/.test(t)?t:t+'.');
 });
 return [...new Set(options)].filter(t=>t.split(/\s+/).length>=5&&/\b(?:is|are|provides?|offers?|sells?|makes?|manufactures?|operates?|develops?|distributes?|designs?|produces?|serves?|supplies|speciali[sz]es?|engages?)\b/i.test(t)&&validShortText(t,quote)).slice(0,12);
}
