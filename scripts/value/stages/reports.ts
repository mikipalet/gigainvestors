import { compareWesternPriority } from "../../../lib/value/western";
import {annualInlineFacts} from '../../../lib/value/annual-inline';
import type {AnnualSourceEvidence} from '../../../lib/value/annual-source-corrections';
import { CompanyFailures } from "../company-failures";
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
  const failures = new CompanyFailures();
  const loadErrors = new Map<string, unknown>();
  const companies = loadCompanies({ only, onError: (company, error) => loadErrors.set(company.id, error) }).sort(compareWesternPriority).slice(0, limit);
  const esefById = new Map<string, Awaited<ReturnType<typeof latestEsef>>>();
  const candidates = companies.filter(company => company.lei && esefCountries.has(company.country));
  const candidateIds = new Set(candidates.map(company => company.id));
  const fallback: typeof companies = [];
  async function processCompany(company: typeof companies[number]): Promise<void> {
    const localAnnual=readCorpusJson<ReportMeta>(`reports/${company.id}/meta.json`);
    const reviewed=readCorpusJson<{reviewedFullAnnual?:boolean}>(`reports/${company.id}/annual-sources.json`);
    const latestPeriod=readCorpusJson<{years:Array<{end:string}>}>(`fundamentals/${company.id}.json`)?.years.at(-1)?.end;
    // Reviewed issuer PDFs and full annual exhibits must survive an OTC listing's
    // empty SEC lookup. A new financial year or --force makes them retryable.
    if(!force&&latestPeriod&&reviewed?.reviewedFullAnnual&&localAnnual?.kind!=='description'
      &&localAnnual?.period===latestPeriod&&localAnnual?.sections.length
      &&localAnnual.sections.every(key=>existsSync(corpusPath(`reports/${company.id}/${key}.txt`))))return;
    if(!force&&localAnnual?.kind==='17-A'&&localAnnual.sections.length&&localAnnual.sections.every(key=>existsSync(corpusPath(`reports/${company.id}/${key}.txt`))))return;
    if (company.source === "edinet") {
      const meta = readCorpusJson<ReportMeta>(`reports/${company.id}/meta.json`);
      if (meta?.kind === "EDINET" && meta.sections.every(key => existsSync(corpusPath(`reports/${company.id}/${key}.txt`)))) return;
      console.warn(`reports: ${company.id} EDINET report missing; run japan to restore it`);
      return;
    }
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
      const html=await (await fetchEdgar(annual.url)).text();
      const priorEvidence=readCorpusJson<AnnualSourceEvidence>(`raw/sec-annual/${company.id}.json`);
      const selection={shareDimensions:priorEvidence?.shareDimensions,revenueConcept:priorEvidence?.revenueConcept,revenueComponents:priorEvidence?.revenueComponents,revenueDimensions:priorEvidence?.revenueDimensions};
      writeCorpusJson(`raw/sec-annual/${company.id}.json`,{...priorEvidence,...selection,source:annual.url,facts:annualInlineFacts(html,{...annual,...selection})});
      const text = htmlToText(html);
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
    saveReport({
      id: company.id, kind: esef ? "ESEF" : annual?.form ?? "description", url: esef?.url ?? annual?.url ?? null,
      filed: esef?.filed ?? annual?.filed ?? null, period: esef?.period ?? annual?.period ?? null,
    }, sections, prior);
    writeCorpusJson(`${directory}/fingerprint.json`, fingerprint);
  }
  async function safely(company: typeof companies[number], run: () => Promise<void>): Promise<void> {
    try {
      if (loadErrors.has(company.id)) throw loadErrors.get(company.id);
      await run();
    } catch (error) {
      failures.record(company.id, error);
      try {
        // Never cache a failure: the next run must retry the filing.
        rmSync(corpusPath(`reports/${company.id}/fingerprint.json`), { force: true });
        const sections = company.description
          ? { business: truncateTokens(company.description, SECTION_TOKENS.business) } : {};
        saveReport({ id: company.id, kind: "description", url: null, filed: null, period: null }, sections);
      } catch (fallbackError) {
        failures.record(company.id, fallbackError);
      }
    }
  }
  // ESEF lookups and reports share three workers; SEC fallbacks join its six-worker pool.
  await Promise.all([
    pool({ items: companies.filter(company => !candidateIds.has(company.id)), concurrency: T.reports.secConcurrency, run: company => safely(company, () => processCompany(company)) }),
    pool({ items: candidates, concurrency: T.reports.esefConcurrency, run: company => safely(company, async () => {
      const esef = await latestEsef(company.lei!);
      if (esef) { esefById.set(company.id, esef); await processCompany(company); }
      else fallback.push(company);
    }) }),
  ]);
  await pool({ items: fallback.sort(compareWesternPriority), concurrency: T.reports.secConcurrency, run: company => safely(company, () => processCompany(company)) });
  failures.finish("reports", companies.length);
}

function saveReport(meta: Omit<ReportMeta, "sections">, sections: Partial<Record<SectionKey, string>>, prior?: ReportMeta | null): void {
  const directory = `reports/${meta.id}`;
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
  for (const key of prior?.sections ?? ["letter", "business", "risk", "mdna", "compensation", "notes", "auditor"]) {
    if (!keys.includes(key)) rmSync(corpusPath(directory, `${key}.txt`), { force: true });
  }
  writeCorpusJson(`${directory}/meta.json`, { ...meta, sections: keys });
}
