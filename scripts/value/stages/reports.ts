import { T } from "../../../lib/value/config";
import { pool } from "../../../lib/value/http";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { corpusPath, readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { loadCompanies } from "../../../lib/value/companies";
import { cutSections, filingBusinessFallback, SECTION_TOKENS, truncateTokens } from "../../../lib/value/reports/cut-sections";
import { fetchEdgar, latestFilings, resolveCik } from "../../../lib/value/reports/edgar";
import { cutEsefSections, fetchEsef, latestEsef } from "../../../lib/value/reports/esef";
import { htmlToText } from "../../../lib/value/reports/html-to-text";
import type { ReportMeta, SectionKey } from "../../../lib/value/types";

const esefCountries = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE GB".split(" "));

export default async function reports({ only, limit, force = false }: {
  only?: string[]; limit?: number; force?: boolean;
}): Promise<void> {
  const companies = loadCompanies({ only, limit });
  const esefById = new Map<string, Awaited<ReturnType<typeof latestEsef>>>();
  const candidates = companies.filter(company => company.lei && esefCountries.has(company.country));
  const candidateIds = new Set(candidates.map(company => company.id));
  const fallback: typeof companies = [];
  async function processCompany(company: typeof companies[number]): Promise<void> {
    const esef = esefById.get(company.id) ?? null;
    const cik = !esef ? await resolveCik(company) : null;
    const filings = cik ? await latestFilings(cik) : null;
    const fingerprint = createHash("sha256").update(JSON.stringify({ version: 5, company, filings, esef })).digest("hex");
    const directory = `reports/${company.id}`;
    const prior = readCorpusJson<ReportMeta>(`${directory}/meta.json`);
    if (!force && readCorpusJson<string>(`${directory}/fingerprint.json`) === fingerprint && prior
      && prior.sections.every((key) => existsSync(corpusPath(directory, `${key}.txt`)))) return;

    const annual = filings?.annual;
    let sections: Partial<Record<SectionKey, string>> = {};
    if (esef) {
      const response = await fetchEsef(esef.url);
      sections = cutEsefSections(await response.text());
    } else if (annual) {
      const text = htmlToText(await (await fetchEdgar(annual.url)).text());
      sections = cutSections({ text, form: annual.form });
      if (!sections.business) {
        sections.business = company.description?.trim()
          ? truncateTokens(company.description, SECTION_TOKENS.business) : filingBusinessFallback(text);
      }
      if (filings?.proxy) {
        const proxy = htmlToText(await (await fetchEdgar(filings.proxy.url)).text());
        Object.assign(sections, cutSections({ text: proxy, form: "DEF 14A" }));
      }
    } else if (company.description) {
      sections.business = truncateTokens(company.description, SECTION_TOKENS.business);
    }
    const keys = Object.keys(sections) as SectionKey[];
    mkdirSync(corpusPath(directory), { recursive: true });
    for (const key of keys) {
      const destination = corpusPath(directory, `${key}.txt`);
      const temporary = `${destination}.${randomUUID()}.tmp`;
      try {
        writeFileSync(temporary, sections[key]!, { flag: "wx" });
        renameSync(temporary, destination);
      } finally {
        rmSync(temporary, { force: true });
      }
    }
    for (const key of prior?.sections ?? []) {
      if (!keys.includes(key)) rmSync(corpusPath(directory, `${key}.txt`), { force: true });
    }
    const meta: ReportMeta = {
      id: company.id, kind: esef ? "ESEF" : annual?.form ?? "description", url: esef?.url ?? annual?.url ?? null,
      filed: esef?.filed ?? annual?.filed ?? null, period: esef?.period ?? annual?.period ?? null, sections: keys,
    };
    writeCorpusJson(`${directory}/meta.json`, meta);
    writeCorpusJson(`${directory}/fingerprint.json`, fingerprint);
  }
  // ESEF lookups and reports share three workers; SEC fallbacks join its six-worker pool.
  await Promise.all([
    pool({ items: companies.filter(company => !candidateIds.has(company.id)), concurrency: T.reports.secConcurrency, run: processCompany }),
    pool({ items: candidates, concurrency: T.reports.esefConcurrency, run: async company => {
      const esef = await latestEsef(company.lei!);
      if (esef) { esefById.set(company.id, esef); await processCompany(company); }
      else fallback.push(company);
    } }),
  ]);
  await pool({ items: fallback, concurrency: T.reports.secConcurrency, run: processCompany });
}
