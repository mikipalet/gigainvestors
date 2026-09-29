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
import type { Analysis, Company, Fundamentals, ReportMeta } from "../../../lib/value/types";

export interface Options {
  only?: string[]; limit?: number; force?: boolean;
  ask?: Ask; getBondYield?: typeof bondYield; evidence?: typeof findEvidence;
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
  const jobs = companies.flatMap(row => {
    if (!validCompanyId(row.id, "analyze")) return [];
    const fundamentals = readCorpusJson<Fundamentals>(`fundamentals/${row.id}.json`);
    const company = { ...row, ...readCorpusJson<Partial<Company>>(`companies/${row.id}.json`), id: row.id };
    return fundamentals ? [{ company, fundamentals }] : [];
  }).slice(0, limit);
  const usdRate = createUsdRate({ force });
  let cursor = 0;
  let written = 0;
  let skipped = 0;
  const failures: string[] = [];
  await Promise.all(Array.from({ length: Math.min(16, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const { company, fundamentals } = jobs[cursor++];
      try {
        const report = readCorpusJson<ReportMeta>(`reports/${company.id}/meta.json`) ?? {
          id: company.id, kind: "description", url: null, filed: null, period: null, sections: [],
        } satisfies ReportMeta;
        const sections = loadSections({ company, report });
        const priceHistory = readPriceHistory(company.id);
        const fingerprint = createHash("sha256").update(JSON.stringify({
          company: {
            id: company.id, kind: company.kind, currency: company.currency, country: company.country,
            description: company.description, sector: company.sector, industry: company.industry,
          }, fundamentals, report, sections, priceHistory,
          questions: QUESTIONS_VERSION, pipeline: PIPELINE_VERSION, thresholds: T, trust })).digest("hex");
        const file = `analysis/${company.id}.json`;
        const fingerprintFile = `analysis/fingerprints/${company.id}.json`;
        if (!force && readCorpusJson<string>(fingerprintFile) === fingerprint && readCorpusJson<Analysis>(file)) { skipped++; continue; }
        const result = await analyzeCompany({ company, fundamentals, sections, report, priceHistory,
          bondYield: fundamentals.integrity.ok ? await getBondYield(company.country) : null, ask, getBondYield, usdRate });
        if (result.status === "scored" && Object.values(result.tests).every(test => test.numeric !== "fail")) {
          for (const test of Object.values(result.tests)) {
            for (const answer of test.jev) {
              const question = QUESTIONS.find(q => q.id === answer.q);
              const text = sections[answer.section];
              if (answer.value !== null && question?.q.type === "noul" && text) {
                answer.evidence = await evidence({ section: text, question: question.q });
              }
            }
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
