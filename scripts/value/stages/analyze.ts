import {balanceSheetsFor} from '../../../lib/value/latest-balance';
import {correctCachedAnnualSources,correctCachedTrailingSources} from '../../../lib/value/annual-source-corrections';
import {publicBusiness} from '../../../lib/value/flags/public';
import {inPublicationScope} from '../../../lib/value/held-universe';
import {cachedQualityQuarters} from '../../../lib/value/cached-quality-quarters';
import {numericMemo} from '../../../lib/value/owner-memo';
import judgementTrust from '../../../lib/value/judgement/trust.json';
import { completeCachedYears, completeCachedSplits, completeCompanyMetadata } from '../../../lib/value/completeness/cached-years';
import { isInvestmentHolding } from '../../../lib/value/investment-nav';
import { fillYears } from '../../../lib/value/completeness/second-sources';
import { deriveYears } from '../../../lib/value/derive';
import { universeCompanies } from '../../../lib/value/companies';
import { supplementFinancialFacts, withFinancialPeers, type CompanyFacts } from '../../../lib/value/financial-facts';
import { esefShareInputs } from "../../../lib/value/italy/shares";
import { normalizeEodhd, refreshEodhdBalance } from "../../../lib/value/normalize-eodhd";
import { checkIntegrity } from "../../../lib/value/integrity";
import { currentShareInputs, trailingInputs } from "../../../lib/value/valuation-inputs";
import { readPrices } from "../../../lib/value/price-files";
import { validCompanyId, mergeCompany } from "../../../lib/value/companies";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { analyzeCompany, PIPELINE_VERSION, type Ask, type Sections } from "../../../lib/value/analyze-company";
import { readPriceHistory } from "../../../lib/value/price-history";
import { bondYield, type BondObservation } from "../../../lib/value/bond-yields";
import { createUsdRate } from "../../../lib/value/fx";
import { T } from "../../../lib/value/config";
import { corpusPath, readCorpusJson, readJsonl, writeCorpusJson } from "../../../lib/value/corpus";
import { findEvidence } from "../../../lib/value/jev/run";
import { QUESTIONS, QUESTIONS_VERSION } from "../../../lib/value/jev/questions";
import trust from "../../../lib/value/jev-trust.json";
import type { Analysis, Company, Fundamentals, ReportMeta, JevQuestion, Year } from "../../../lib/value/types";

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
  const companies = universeCompanies().filter(company => !only || only.includes(company.id));
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
    if (!existsSync(corpusPath(`fundamentals/${row.id}.json`))) return [];
    const company = completeCompanyMetadata(mergeCompany(row, readCorpusJson<Partial<Company>>(`companies/${row.id}.json`) ?? {}),readCorpusJson);
    return [{ company }];
  }).slice(0, limit);
  const peerRows = withFinancialPeers((jobs.some(j=>j.company.kind==='bank')?readJsonl<Company>('universe.jsonl'):[]).filter(c=>c.kind==='bank'&&validCompanyId(c.id,'financial peers')).map(company=>{
    const f=readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
    const facts=readCorpusJson<CompanyFacts>(`raw/sec-companyfacts/${company.id}.json`);
    return {company,years:facts?supplementFinancialFacts(f?.years??[],facts):f?.years??[]};
  }));
  const peers = new Map(peerRows.map(r=>[r.company.id,new Map(r.years.map(y=>[y.end,y.peerCreditLossRate]))]));
  const usdRate = createUsdRate({ force });
  const prices = { ...readPrices(corpusPath("prices")), ...readPrices(corpusPath("publish-repo/prices")) };
  let cursor = 0;
  let written = 0;
  let skipped = 0;
  const failures: string[] = [];
  await Promise.all(Array.from({ length: Math.min(Number(process.env.VALUE_ANALYZE_CONCURRENCY)||T.analyze.concurrency, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const { company } = jobs[cursor++];
      try {
        // Keep statement payloads bounded by worker count, not universe size.
        const cachedFundamentals = readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
        if (!cachedFundamentals) throw new Error('Selected fundamentals disappeared');
        const priceHistory = readPriceHistory(company.id);
        const raw = readCorpusJson<unknown>(`raw/eodhd/${company.id}.json`);
        const normalized = raw ? normalizeEodhd(raw, company.id).fundamentals : null;
        const mapped = new Map(normalized?.years.map(year => [year.end, year]));
        const fundamentals = { ...cachedFundamentals, years: deriveYears(normalized
          ? fillYears(cachedFundamentals.years, normalized.years) : cachedFundamentals.years) };
        if (raw) {
          fundamentals.years=fundamentals.years.map(year=>refreshEodhdBalance(year,mapped.get(year.end),raw,company.country));
          // Include a changed-currency suffix even when normalization has already truncated it.
          if (normalized?.integrity.notes?.some(note => note.startsWith('reporting currency changed'))) {
            fundamentals.years = fundamentals.years.filter(year => mapped.has(year.end));
            fundamentals.integrity = { ...fundamentals.integrity, notes: [...new Set([...(fundamentals.integrity.notes ?? []), ...normalized.integrity.notes])] };
          }
          fundamentals.integrity = checkIntegrity(fundamentals, { source: company.source, priceHistory });
          fundamentals.ttm = trailingInputs(raw, fundamentals.years.at(-1));
          fundamentals.balanceSheets = balanceSheetsFor(company.id,raw);
        }
        const sectorFacts = readCorpusJson<CompanyFacts>(`raw/sec-companyfacts/${company.id}.json`);
        if (sectorFacts) {
          fundamentals.years = supplementFinancialFacts(fundamentals.years, sectorFacts);
          fundamentals.integrity = checkIntegrity(fundamentals, {source:company.source,priceHistory});
        }
        fundamentals.splits = completeCachedSplits(company.id,fundamentals.splits,readCorpusJson);
        fundamentals.years = completeCachedYears(company,fundamentals.years,readCorpusJson);
        fundamentals.years = correctCachedAnnualSources(company,fundamentals.years,raw,readCorpusJson,fundamentals.splits);
        fundamentals.integrity = checkIntegrity(fundamentals,{source:company.source,priceHistory});
        fundamentals.years = fundamentals.years.map(y=>({...y,peerCreditLossRate:peers.get(company.id)?.get(y.end)??y.peerCreditLossRate}));
        if(!raw)fundamentals.balanceSheets=[...(fundamentals.balanceSheets??[]),...balanceSheetsFor(company.id,null)];
        fundamentals.ttm=correctCachedTrailingSources(company.id,fundamentals.ttm,readCorpusJson);
        fundamentals.currentCommonBalance=readCorpusJson<import('../../../lib/value/types').CurrentCommonBalance>(`raw/reviewed-common-balance/${company.id}.json`)??undefined;
        fundamentals.qualityQuarters=cachedQualityQuarters(company.id,readCorpusJson);
        const shareInputs = company.source === 'esef' && !fundamentals.years.at(-1)?.dilutedShares
          ? await esefShareInputs(company, usdRate)
          : currentShareInputs(raw, prices[company.id]?.[0] ?? null, company.currency);
        const report = readCorpusJson<ReportMeta>(`reports/${company.id}/meta.json`) ?? {
          id: company.id, kind: "description", url: null, filed: null, period: null, sections: [],
        } satisfies ReportMeta;
        const sections = loadSections({ company, report });
        const historyAttempts = readCorpusJson<{ failures?: number }>(`prices-history/meta/${company.id}.json`);
        const priceHistoryPending = priceHistory === null && (historyAttempts?.failures ?? 0) < 3;
        const localBondYield = fundamentals.integrity.ok ? await getBondYield(company.country) : null;
        const fingerprint = createHash("sha256").update(JSON.stringify({
          company: {
            id: company.id, investmentHolding: isInvestmentHolding(company, fundamentals.years), kind: company.kind, currency: company.currency, country: company.country,
            description: company.description, sector: company.sector, industry: company.industry,
          }, fundamentals, report, sections, priceHistory, priceHistoryPending, shareInputs,
          bondYieldBucket: localBondYield === null ? null : Math.round(localBondYield * 1000),
          qualityPeriods:fundamentals.qualityQuarters.filter(q=>q.filed<new Date().toISOString().slice(0,10)).map(q=>q.year.end),
          memoInputs: 1, flags:readCorpusJson(`flags/${company.id}.json`), judgementTrust, judgement: readCorpusJson(`judgement/${company.id}.json`), questions: QUESTIONS_VERSION, pipeline: PIPELINE_VERSION, thresholds: T, trust })).digest("hex");
        const file = `analysis/${company.id}.json`;
        const fingerprintFile = `analysis/fingerprints/${company.id}.json`;
        const prior = readCorpusJson<Analysis>(file);
        if (!force && readCorpusJson<string>(fingerprintFile) === fingerprint
          && prior?.versions.pipeline === PIPELINE_VERSION && prior.versions.questions === QUESTIONS_VERSION) { skipped++; continue; }
        const priorInputs = readCorpusJson<{ asOf?: string; sections: Sections; reportingCurrency?: string; derivedValues?: unknown[]; memoYears?: Year[] }>(`analysis/inputs/${company.id}.json`);
        let derivedValues:Array<{fy:number;field:string;value:number;provenance:NonNullable<Year['provenance']>[string]}>=[];
        let memoYears: Year[] = [];
        const result = await analyzeCompany({ company, fundamentals, sections, report, priceHistory, priceHistoryPending, ...shareInputs,
          onMemoYears: years => { memoYears = [...years]; },
          judgement: readCorpusJson(`judgement/${company.id}.json`), bondYield: localBondYield, ask, getBondYield, usdRate,onDerivedYears:years=>{
            derivedValues=years.flatMap(y=>(['marketCap','averageSharePrice','buybacks'] as const).flatMap(field=>{
              const value=y[field],provenance=y.provenance?.[field];
              return typeof value==='number'&&Number.isFinite(value)&&provenance&&(field!=='buybacks'||provenance.method==='estimate')?[{fy:y.fy,field,value,provenance}]:[];
            }));
          } });
        const yieldInfo = getBondYield === bondYield ? readCorpusJson<BondObservation>(`bonds/${company.country}.json`) : null;
        if (result.valuation && yieldInfo) {
          result.valuation.bondSource = yieldInfo.source;
          result.valuation.bondFlags = yieldInfo.flags;
          result.valuation.assumptions.push(`Local 10-year yield: ${yieldInfo.source} (${yieldInfo.symbol}, observed ${yieldInfo.observedAt ?? 'unavailable'}; checked ${yieldInfo.date})`);
          if (yieldInfo.flags.length) result.valuation.assumptions.push(`Bond yield flags: ${yieldInfo.flags.join(', ')}`);
        }
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
            const previous = Object.values(prior?.tests ?? {}).flatMap(test => test.jev);
            // A changed yield does not change evidence in identical filing text.
            const reusable = !force && prior?.versions.questions === QUESTIONS_VERSION
              && priorInputs?.sections[section] === sections[section]
              && answers.every(answer => previous.some(old => old.q === answer.q && old.section === section
                && old.value === answer.value && old.probability === answer.probability && old.trusted === answer.trusted));
            if (reusable) {
              for (const answer of answers) answer.evidence = previous.find(old=>old.q === answer.q && old.section === section)!.evidence;
              continue;
            }
            const questions = Object.fromEntries(answers.map(answer => [answer.q, QUESTIONS.find(q => q.id === answer.q)!.q]));
            const found = await evidence({ section: sections[section]!, questions });
            for (const answer of answers) answer.evidence = found?.[answer.q] ?? null;
          }
        }
        result.ownerMemo = {version:1,asOf:result.asOf,inputHash:fingerprint,lines:numericMemo(result,memoYears,null)};
        // Only index members and held companies are published; avoid duplicating the full private
        // universe's statements just to compose the published memos.
        const inputPayload = { sections,reportingCurrency:fundamentals.currency,derivedValues,
          ...(inPublicationScope(company) ? {memoYears} : {}) };
        const { asOf: _priorInputTime, ...priorPayload } = priorInputs ?? {};
        // Nonmember inputs are an evidence cache, not a published statement
        // snapshot. Preserve unchanged text (and overlay hardlinks) across runs.
        // Members still bind memoYears to this exact analysis timestamp.
        if (inPublicationScope(company) || !isDeepStrictEqual(priorPayload, inputPayload)) {
          writeCorpusJson(`analysis/inputs/${company.id}.json`, { asOf: result.asOf, ...inputPayload });
        }
        result.businessDepth=publicBusiness(readCorpusJson(`flags/${company.id}.json`),result);
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
