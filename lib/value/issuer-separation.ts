import registry from './issuer-registry.json';
import type {Company} from './types';

type RejectedGroup={ids:string[];identifiers?:Record<string,{CIK?:string|null}>;secCik?:Record<string,string|null>};
const rejected=registry.rejected as unknown as RejectedGroup[];

/** A reviewed distinct issuer must never become a source through stale listings. */
export function sameIssuerListings(company:Pick<Company,'id'> & Partial<Pick<Company,'listings'>>):string[]{
 const distinct=new Set(rejected.filter(group=>group.ids.includes(company.id)).flatMap(group=>group.ids.filter(id=>id!==company.id)));
 return (company.listings??[company.id]).filter(id=>!distinct.has(id));
}

/** SEC's own ticker map outranks vendor identifiers, which reuse stale CIKs across split-offs. */
function groupCik(group:RejectedGroup,id:string):number|null{
 const cik=group.secCik&&id in group.secCik?group.secCik[id]:group.identifiers?.[id]?.CIK;
 return cik?Number(cik):null;
}

/** Reviewed SEC CIK for a member of a distinct-issuer group; the company's own value otherwise. */
export function reviewedCik(company:Pick<Company,'id'|'cik'>):string|null{
 const group=rejected.find(group=>group.secCik&&company.id in group.secCik);
 if(!group)return company.cik;
 const cik=groupCik(group,company.id);
 return cik===null?null:String(cik).padStart(10,'0');
}

/** The distinct issuer that owns this SEC CIK, when it is not the company itself. */
export function wrongIssuerOf(company:Pick<Company,'id'>,cik:string|number|null|undefined):string|null{
 if(cik===null||cik===undefined||!/^\d+$/.test(String(cik)))return null;
 for(const group of rejected.filter(group=>group.ids.includes(company.id))){
  if(groupCik(group,company.id)===Number(cik))continue;
  const owner=group.ids.find(id=>id!==company.id&&groupCik(group,id)===Number(cik));
  if(owner)return owner;
 }
 return null;
}

const filingCik=(url:string|null|undefined)=>url?.match(/(?:edgar\/data\/|CIK)(\d+)/i)?.[1];

/** Reject known wrong-issuer SEC evidence before reading its text or numbers. */
export function assertFilingIssuer(company:Pick<Company,'id'>,url:string|null|undefined):void{
 const cik=filingCik(url),owner=wrongIssuerOf(company,cik);
 if(owner)throw Error(`Wrong issuer filing for ${company.id}: SEC CIK ${Number(cik)} belongs to ${owner}`);
}

export const isWrongIssuerFiling=(company:Pick<Company,'id'>,url:string|null|undefined)=>wrongIssuerOf(company,filingCik(url))!==null;

export const inDistinctIssuerGroup=(id:string)=>rejected.some(group=>group.ids.includes(id));
