import { enrichedCompany } from "./enrichment";
import { readCorpusJson, readJsonl } from "./corpus";
import type { Company } from "./types";

/** Reject unsafe paths without stopping a whole stage. */
export function validCompanyId(id: unknown, stage: string): id is string {
  if (typeof id === "string" && /^[\w.&-]+$/.test(id) && id !== "." && id !== "..") return true;
  console.warn(`${stage}: skipping invalid company ID ${JSON.stringify(id)}`);
  return false;
}

export function loadCompanies({ only, limit, onError }: {
  only?: string[]; limit?: number; onError?: (company: Company, error: unknown) => void;
}): Company[] {
  return readJsonl<Company>("universe.jsonl")
    .filter((company) => !only || only.includes(company.id))
    .filter(company => validCompanyId(company.id, "companies")).slice(0, limit)
    .map((company) => {
      try {
        const enriched = readCorpusJson<Partial<Company>>(`companies/${company.id}.json`);
        // Missing and null enrichment must not erase known universe values.
        const overlay = Object.fromEntries(Object.entries(enriched ?? {}).filter(([, value]) => value != null));
        return enrichedCompany(withEnglishName(mergeCompany(company, overlay)), true);
      } catch (error) {
        if (!onError) throw error;
        onError(company, error);
        return company;
      }
    });
}

export function mergeCompany(row: Company, patch: Partial<Company>): Company {
 const merged = {...row, ...Object.fromEntries(Object.entries(patch).filter(([,v])=>v!=null)), id:row.id};
 if (/[^\x00-\x7F]/.test(merged.name) && /^[\x00-\x7F]+$/.test(row.name)) {
   merged.nativeName=merged.name; merged.name=row.name;
 }
 return merged;
}

/** Use an explicitly linked listing from the same issuer, preserving the native name. */
export function withEnglishName(company: Company): Company {
 if (/^[\x00-\x7F]+$/.test(company.name)) return company;
 for (const id of company.listings) {
  if (id === company.id || !validCompanyId(id, 'display-name')) continue;
  const raw=readCorpusJson<{General?:{Name?:string}}>(`raw/eodhd/${id}.json`);
  const name=raw?.General?.Name;
  if(name&&/^[\x00-\x7F]+$/.test(name)) return {...company,nativeName:company.nativeName??company.name,name:name.replace(/\s+(?:ADR|ADS)$/i,'')};
 }
 return company;
}
