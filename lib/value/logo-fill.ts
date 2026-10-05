import {readCorpusJson} from './corpus';
import {iconHash,LOGO_VALIDATION_VERSION,rejectedLogoHashes} from './logo-validation';
import type {Dossier,IndexRow} from './types';

/** Fill presentation only, after verdict/coverage preservation and before browser views.
 * Never replace an existing logo, approve pending identities, or change financial data. */
export function fillPublishedLogos(files:Record<string,unknown>):void {
 const resolved=new Map<string,string|null>();
 const logoFor=(id:string):string|null=>{
  if(resolved.has(id))return resolved.get(id)!;
  const r=readCorpusJson<{asset?:string;logo?:string;validated?:boolean;validationVersion?:number;identityReview?:string;originalHash?:string}>(`enrichment-v7/logos/${id}.json`);
  let logo:string|null=null;
  if(r?.validated&&r.validationVersion===LOGO_VALIDATION_VERSION&&!['pending','rejected'].includes(r.identityReview??'')&&r.asset&&/^[a-f0-9]{64}$/.test(r.asset)&&r.logo===`/api/value/logo?asset=${r.asset}`&&!rejectedLogoHashes(id).has(r.originalHash??'')&&!rejectedLogoHashes(id).has(r.asset)){
   const asset=readCorpusJson<{data:string}>(`enrichment-v7/logos/assets/${r.asset}.json`);
   if(!asset||iconHash(Buffer.from(asset.data,'base64'))!==r.asset)throw Error(`Invalid approved logo asset for ${id}`);
   files[`logos/${r.asset}.json`]=asset;logo=r.logo;
  }
  resolved.set(id,logo);return logo;
 };
 for(const [file,data]of Object.entries(files)){
  if(/^index\/(?:[A-Z]{2}|default)\.json$/.test(file)||file==='history/companies.json'){
   files[file]=(data as IndexRow[]).map(row=>{const logo=!row.lg&&logoFor(row.id);return logo?{...row,lg:logo}:row;});
  }else if(/^dossiers\/\d{3}\.json$/.test(file)){
   files[file]=Object.fromEntries(Object.entries(data as Record<string,Dossier>).map(([id,d])=>{const logo=!d.company.logo&&logoFor(id);return [id,logo?{...d,company:{...d.company,logo}}:d];}));
  }
 }
}
