import { readCorpusJson, readJsonl } from "./corpus";
import type { Company } from "./types";

export function loadCompanies({ only, limit }: { only?: string[]; limit?: number }): Company[] {
  return readJsonl<Company>("universe.jsonl")
    .filter((company) => !only || only.includes(company.id)).slice(0, limit)
    .map((company) => {
      if (!/^[\w.-]+$/.test(company.id)) throw new Error("Invalid company ID");
      const enriched = readCorpusJson<Partial<Company>>(`companies/${company.id}.json`);
      // Missing and null enrichment must not erase known universe values.
      const overlay = Object.fromEntries(Object.entries(enriched ?? {}).filter(([, value]) => value != null));
      return { ...company, ...overlay };
    });
}
