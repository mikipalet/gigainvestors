import { currentShareInputs, leaseInputs } from "../../../lib/value/valuation-inputs";
import { readPrices } from "../../../lib/value/price-files";
import { validCompanyId } from "../../../lib/value/companies";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { analyzeCompany, PIPELINE_VERSION, type Ask, type Sections } from "../../../lib/value/analyze-company";
import { readPriceHistory } from "../../../lib/value/price-history";
import { bondYield } from "../../../lib/value/bond-yields";
import { createUsdRate } from "../../../lib/value/fx";
import { T } from "../../../lib/value/config";
import { corpusPath, readCorpusJson, readJsonl, writeCorpusJson } from "../../../lib/value/corpus";
import { findEvidence } from "../../../lib/value/jev/run";
import { QUESTIONS, QUESTIONS_VERSION } from "../../../lib/value/jev/questions";
import trust from "../../../lib/value/jev-trust.json";
import type { Analysis, Company, Fundamentals, ReportMeta, JevQuestion } from "../../../lib/value/types";

export interface Options {
  only?: string[]; limit?: number; force?: boolean;
  ask?: Ask; getBondYield?: typeof bondYield; evidence?: (args: { section: string; questions: Record<string, JevQuestion> }) => Promise<Record<string, string | null> | null>;
}

export function loadSections({ company, report }: { company: Company; report: ReportMeta }): Sections {
  if (report.kind === "description") return { description: company.description ?? "" };
  const sections: Sections = {};
  for (const key of report.sections) {
    try { sections[key] = readFileSync(corpusPath(`reports/${company.id}/${key}.txt`), "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  return sections;
}

export default async function analyze({ only, limit, force, ask, getBondYield = bondYield, evidence = findEvidence }: Options): Promise<void> {
  const companies = readJsonl<Company>("universe.jsonl").filter(company => !only || only.includes(company.id));
  // Offline repairs can change cached records that dedupe removed from the universe.
  // Honor explicit IDs without adding those aliases back to published coverage.
  const selected = new Set(companies.map(company => company.id));
  for (const id of only ?? []) {
    if (selected.has(id) || !validCompanyId(id, "analyze")) continue;
    const cached = readCorpusJson<Company>(`companies/${id}.json`);
    if (cached?.id === id) { companies.push(cached); selected.add(id); }
  }
  const jobs = companies.flatMap(row => {
    if (!validCompanyId(row.id, "analyze")) return [];
    const fundamentals = readCorpusJson<Fundamentals>(`fundamentals/${row.id}.json`);
    const company = { ...row, ...readCorpusJson<Partial<Company>>(`companies/${row.id}.json`), id: row.id };
    return fundamentals ? [{ company, fundamentals }] : [];
  }).slice(0, limit);
  const usdRate = createUsdRate({ force });
  const prices = { ...readPrices(corpusPath("prices")), ...readPrices(corpusPath("publish-repo/prices")) };
  let cursor = 0;
  let written = 0;
  let skipped = 0;
  const failures: string[] = [];
  await Promise.all(Array.from({ length: Math.min(T.analyze.concurrency, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const { company, fundamentals: cachedFundamentals } = jobs[cursor++];
      try {
        const raw = readCorpusJson<unknown>(`raw/eodhd/${company.id}.json`);
        const fundamentals = raw ? { ...cachedFundamentals, years: cachedFundamentals.years.map(year => ({
          ...year, ...leaseInputs(raw, year.end, company.country),
        })) } : cachedFundamentals;
        const shareInputs = currentShareInputs(raw, prices[company.id]?.[0] ?? null, company.currency);
        const report = readCorpusJson<ReportMeta>(`reports/${company.id}/meta.json`) ?? {
          id: company.id, kind: "description", url: null, filed: null, period: null, sections: [],
        } satisfies ReportMeta;
        const sections = loadSections({ company, report });
        const priceHistory = readPriceHistory(company.id);
        const historyAttempts = readCorpusJson<{ failures?: number }>(`prices-history/meta/${company.id}.json`);
        const priceHistoryPending = priceHistory === null && (historyAttempts?.failures ?? 0) < 3;
        const fingerprint = createHash("sha256").update(JSON.stringify({
          company: {
            id: company.id, kind: company.kind, currency: company.currency, country: company.country,
            description: company.description, sector: company.sector, industry: company.industry,
          }, fundamentals, report, sections, priceHistory, priceHistoryPending, shareInputs,
          questions: QUESTIONS_VERSION, pipeline: PIPELINE_VERSION, thresholds: T, trust })).digest("hex");
        const file = `analysis/${company.id}.json`;
        const fingerprintFile = `analysis/fingerprints/${company.id}.json`;
        if (!force && readCorpusJson<string>(fingerprintFile) === fingerprint && readCorpusJson<Analysis>(file)) { skipped++; continue; }
        const result = await analyzeCompany({ company, fundamentals, sections, report, priceHistory, priceHistoryPending, ...shareInputs,
          bondYield: fundamentals.integrity.ok ? await getBondYield(company.country) : null, ask, getBondYield, usdRate });
        if (!priceHistoryPending && priceHistory === null && result.tests.management.result === 'unclear') result.tests.management.reasons.push('Price history unavailable from provider');
        if (result.status === "scored" && Object.values(result.tests).every(test => test.numeric !== "fail")) {
          const eligible = Object.values(result.tests).flatMap(test => test.jev).filter(answer => {
            const question = QUESTIONS.find(q => q.id === answer.q);
            return question?.q.type === 'noul' && trust.trusted.includes(question.id)
              && (trust.versions as Record<string, string>)[question.id] === question.version
              && typeof answer.value === 'number' && answer.value >= 0.7 && sections[answer.section];
          });
          for (const section of new Set(eligible.map(answer => answer.section))) {
            const answers = eligible.filter(answer => answer.section === section);
            const questions = Object.fromEntries(answers.map(answer => [answer.q, QUESTIONS.find(q => q.id === answer.q)!.q]));
            const found = await evidence({ section: sections[section]!, questions });
            for (const answer of answers) answer.evidence = found?.[answer.q] ?? null;
          }
        }
        writeCorpusJson(`analysis/inputs/${company.id}.json`, { asOf: result.asOf, sections });
        writeCorpusJson(file, result);
        writeCorpusJson(fingerprintFile, fingerprint);
        written++;
      } catch (error) {
        console.error(`analyze: ${company.id}: ${error instanceof Error ? error.message : String(error)}`);
        failures.push(company.id);
      }
    }
  }));
  console.log(`analyze: ${written} written, ${skipped} unchanged, ${failures.length} failed`);
  if (failures.length) throw new Error(`Analysis failed for: ${failures.join(", ")}`);
}
