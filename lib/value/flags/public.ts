import {trustedReading} from '../judgement/apply';
import judgementTrust from '../judgement/trust.json';
import type {Analysis} from '../types';
import {materialFlags,economicRelationships} from './materiality';
import type {PublicBusiness} from './types';
import {validEvidence,trustedExtraction} from './trust';
import trust from './trust.json';
/** Reapply the trust boundary when loading or publishing, including old cached dossiers. */
export function publicBusiness(record?:PublicBusiness|null,analysis?:Analysis):PublicBusiness|undefined{
 if(!record)return undefined;
 const flags=record.flags.filter(f=>f.kind!=='goodwill-equity').map(f=>f.kind==='capital-intensity'&&f.ruleVersion!==2?{...f,tone:'neutral' as const,severity:20,why:'Capital spending exceeds the accounting charge. A comparable three-year return on this spending has not been established; context only.'}:f).filter(f=>f.evidence.length>0&&f.evidence.every(validEvidence)&&Number.isFinite(f.severity)&&f.label.trim()&&(
  f.basis==='computed'||f.extraction==='judgement'&&f.kind==='pricing-resilience'&&trustedReading({id:'pricing',value:'demonstrated',version:f.version??'',confidence:f.confidence??0,evidence:f.evidence[0]},judgementTrust)||((f.extraction==='relationship'?trust.relationship.classes.customer:(trust.signal.classes as Record<string,number>)[f.kind])??0)>=.9&&trustedExtraction({version:f.version??'',confidence:f.confidence??0,evidence:f.evidence[0],reviewed:f.reviewed},f.extraction==='relationship'?trust.relationship:trust.signal)
 ));
 const relationships=record.relationships.filter(r=>r.evidence.length>0&&r.evidence.every(validEvidence)&&r.from!==r.to&&(
  r.basis==='wikidata'&&r.evidence.every(e=>e.url.startsWith('https://www.wikidata.org/wiki/'))||((trust.relationship.classes as Record<string,number>)[r.type.replace('-','_')]??0)>=.9&&trustedExtraction({version:r.version??'',confidence:r.confidence??0,evidence:r.evidence[0],reviewed:r.reviewed},trust.relationship)
 ));
 return {asOf:record.asOf,usdRates:record.usdRates,flags:analysis?materialFlags(flags,analysis,record.usdRates):flags,relationships:economicRelationships(relationships,analysis?.company.id??relationships[0]?.evidence[0]?.disclosedBy??'')};
}
