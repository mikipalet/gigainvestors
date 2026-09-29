import { readCorpusJson, readJsonl } from "./corpus";
import type { Company } from "./types";

/** Reject unsafe paths without stopping a whole stage. */
export function validCompanyId(id: unknown, stage: string): id is string {
  if (typeof id === "string" && /^[\w.&-]+$/.test(id) && id !== "." && id !== "..") return true;
  console.warn(`${stage}: skipping invalid company ID ${JSON.stringify(id)}`);
  return false;
}

export function loadCompanies({ only, limit }: { only?: string[]; limit?: number }): Company[] {
  return readJsonl<Company>("universe.jsonl")
    .filter((company) => !only || only.includes(company.id))
    .filter(company => validCompanyId(company.id, "companies")).slice(0, limit)
    .map((company) => {
      const enriched = readCorpusJson<Partial<Company>>(`companies/${company.id}.json`);
      // Missing and null enrichment must not erase known universe values.
      const overlay = Object.fromEntries(Object.entries(enriched ?? {}).filter(([, value]) => value != null));
      return { ...company, ...overlay, id: company.id };
    });
}
