import { PriceHistoryUnavailableError } from "../../../lib/value/price-history";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { loadCompanies } from "../../../lib/value/companies";
import {
  corpusPath,
  readCorpusJson,
  writeCorpusJson,
} from "../../../lib/value/corpus";
import { T } from "../../../lib/value/config";
import { createUsdRate } from "../../../lib/value/fx";
import { pool } from "../../../lib/value/http";
import { checkIntegrity } from "../../../lib/value/integrity";
import {
  allEsefFilings,
  filingFacts,
  italyText,
  resolveItalianLei,
} from "../../../lib/value/italy/client";
import {
  MILAN_LIST_URL,
  mergeItalianCompanies,
  parseMilanCsv,
} from "../../../lib/value/italy/companies";
import { mergeEsefYears, yearsFromEsef } from "../../../lib/value/italy/facts";
import { italianPrices } from "../../../lib/value/italy/prices";
import { cutEsefSections } from "../../../lib/value/reports/esef";
import type {
  Company,
  Fundamentals,
  ReportMeta,
  SectionKey,
  Year,
  PriceMap,
} from "../../../lib/value/types";

export default async function italy(options: {
  only?: string[];
  limit?: number;
  force?: boolean;
}): Promise<void> {
  const rawDir = corpusPath("raw/esef");
  mkdirSync(rawDir, { recursive: true });
  const listFile = `${rawDir}/milan-${new Date().toISOString().slice(0, 10)}.csv`;
  if (options.force || !existsSync(listFile))
    writeFileSync(listFile, await italyText(MILAN_LIST_URL));
  const all = parseMilanCsv(readFileSync(listFile, "utf8"));
  const selected = all
    .filter((c) => !options.only || options.only.includes(c.id))
    .slice(0, options.limit);
  const quotes: PriceMap = {};
  const incoming: Company[] = [];
  const errors: Array<{ id: string; error: string }> = [];
  const gaps: Array<{ id: string; reason: string }> = [];
  const usd = createUsdRate();
  const eur = await usd("EUR");
  let completed = 0;
  function checkpoint() {
    const existing = loadCompanies({});
    const result = mergeItalianCompanies({ existing, incoming });
    for (const entry of result.merged) {
      const company = existing.find((c) => c.id === entry.from);
      if (company)
        writeCorpusJson(`raw/esef/merged-companies/${entry.from}.json`, {
          company,
          to: entry.to,
        });
    }
    // Rebuild from canonical identities so checkpoint merges cannot leave cycles.
    writeCorpusJson(
      "raw/esef/merged-listings.json",
      result.companies
        .filter((c) => c.source === "esef")
        .flatMap((c) =>
          c.listings
            .filter((id) => id !== c.id)
            .map((from) => ({ from, to: c.id })),
        ),
    );
    const target = corpusPath("universe.jsonl");
    writeFileSync(
      `${target}.${process.pid}.tmp`,
      result.companies.map((c) => JSON.stringify(c)).join("\n") + "\n",
    );
    renameSync(`${target}.${process.pid}.tmp`, target);
    for (const c of result.companies.filter((c) =>
      incoming.some((i) => i.id === c.id),
    ))
      writeCorpusJson(`companies/${c.id}.json`, c);
  }
  await pool({
    items: selected,
    concurrency: T.esef.concurrency,
    run: async (company) => {
      try {
        let priceData: Awaited<ReturnType<typeof italianPrices>> | null = null;
        try {
          priceData = await italianPrices({ company, force: options.force });
          if (priceData.quote) quotes[company.id] = priceData.quote;
          else
            gaps.push({
              id: company.id,
              reason: "Yahoo has history but no usable current quote",
            });
        } catch (error) {
          if (error instanceof PriceHistoryUnavailableError)
            gaps.push({ id: company.id, reason: error.message });
          else
            errors.push({
              id: company.id,
              error:
                error instanceof Error ? error.message : "Yahoo unavailable",
            });
        }
        company.lei = await resolveItalianLei(company, options.force);
        if (!company.lei) {
          gaps.push({ id: company.id, reason: "No unique GLEIF LEI match" });
          incoming.push(company);
          return;
        }
        const filings = await allEsefFilings(company.lei, options.force);
        if (!filings.length) {
          gaps.push({ id: company.id, reason: "No ESEF filing available" });
          incoming.push(company);
          return;
        }
        const fingerprint = createHash("sha256")
          .update(JSON.stringify({ version: 1, filings }))
          .digest("hex");
        const cached = readCorpusJson<{
          fingerprint: string;
          company: Company;
        }>(`raw/esef/issuers/${company.id}.json`);
        const meta = readCorpusJson<ReportMeta>(
          `reports/${company.id}/meta.json`,
        );
        if (
          !options.force &&
          cached?.fingerprint === fingerprint &&
          readCorpusJson(`fundamentals/${company.id}.json`) &&
          readCorpusJson(`prices-history/${company.id}.json`) &&
          meta?.kind === "ESEF" &&
          meta.sections.every((k) =>
            existsSync(corpusPath(`reports/${company.id}/${k}.txt`)),
          )
        ) {
          incoming.push(cached.company);
          return;
        }
        let years: Year[] = [];
        let incomplete = false;
        for (const filing of filings) {
          try {
            years = mergeEsefYears(
              years,
              yearsFromEsef({
                raw: await filingFacts(filing),
                lei: company.lei,
              }),
            );
          } catch (error) {
            incomplete = true;
            errors.push({
              id: company.id,
              error: `filing ${filing.id}: ${error instanceof Error ? error.message : "Unavailable"}`,
            });
          }
        }
        if (!years.length) {
          gaps.push({
            id: company.id,
            reason: "No usable consolidated annual IFRS facts",
          });
          incoming.push(company);
          return;
        }
        const latest = filings.at(-1)!;
        const a = latest.attributes;
        const reportFile = `${rawDir}/reports/${latest.id}.xhtml`;
        mkdirSync(`${rawDir}/reports`, { recursive: true });
        const url = new URL(a.report_url, "https://filings.xbrl.org").href;
        if (!existsSync(reportFile))
          writeFileSync(
            reportFile,
            (await italyText(url)).replace(
              /data:(?:image|font)\/[^;"'\s]+;base64,[A-Za-z0-9+/=\r\n]+/gi,
              "",
            ),
          );
        const sections = cutEsefSections(readFileSync(reportFile, "utf8"));
        const keys = Object.keys(sections) as SectionKey[];
        const reportDir = corpusPath(`reports/${company.id}`);
        mkdirSync(reportDir, { recursive: true });
        for (const key of keys) {
          writeFileSync(`${reportDir}/${key}.txt.tmp`, sections[key]!);
          renameSync(`${reportDir}/${key}.txt.tmp`, `${reportDir}/${key}.txt`);
        }
        writeCorpusJson(`reports/${company.id}/meta.json`, {
          id: company.id,
          kind: "ESEF",
          url,
          filed: a.date_added.slice(0, 10),
          period: a.period_end,
          sections: keys,
        } satisfies ReportMeta);
        if (priceData) {
          const { prices, quote } = priceData;
          const shares =
            years.at(-1)?.sharesOutstanding ?? years.at(-1)?.dilutedShares;
          if (shares && eur && quote)
            company.marketCapUsd = shares * quote[0] * eur;
          years = years.map((y) => ({
            ...y,
            marketCap:
              y.currency === "EUR" && y.dilutedShares
                ? y.dilutedShares *
                    (prices.find(([m]) => m === y.end.slice(0, 7))?.[1] ?? 0) ||
                  null
                : null,
          }));
        }
        // ESEF bank income statements do not call interest income "revenue".
        if (
          /\b(BANCA|BANCO|BANK|INTESA|UNICREDIT|BPER|BFF|MEDIOBANCA|FINECO)\b/i.test(
            company.name,
          )
        )
          company.kind = "bank";
        else if (/\b(GENERALI|UNIPOL|ASSICURAZIONI)\b/i.test(company.name))
          company.kind = "insurer";
        const f: Fundamentals = {
          id: company.id,
          currency: years.at(-1)?.currency ?? "EUR",
          years,
          integrity: { ok: false, reasons: [] },
          fetchedAt: new Date().toISOString(),
        };
        f.integrity = checkIntegrity(f, { source: "esef" });
        writeCorpusJson(`fundamentals/${company.id}.json`, f);
        incoming.push(company);
        if (!incomplete)
          writeCorpusJson(`raw/esef/issuers/${company.id}.json`, {
            fingerprint,
            company,
            filings: filings.map((f) => f.id),
          });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Italy import failed";
        errors.push({ id: company.id, error: message });
        console.warn(`italy: ${company.id}: ${message}`);
        incoming.push(company);
      } finally {
        if (++completed % T.esef.checkpointCompanies === 0) checkpoint();
        if (completed % 10 === 0) {
          console.log(
            `italy: ${completed}/${selected.length}, ${errors.length} errors, ${gaps.length} gaps`,
          );
        }
      }
    },
  });
  checkpoint();
  writeCorpusJson("prices/IT.json", {
    ...(readCorpusJson<PriceMap>("prices/IT.json") ?? {}),
    ...quotes,
  });
  const companies = loadCompanies({}).filter((c) => c.source === "esef");
  const fundamentals = companies
    .map((c) => readCorpusJson<Fundamentals>(`fundamentals/${c.id}.json`))
    .filter((f): f is Fundamentals => !!f);
  const summary = {
    at: new Date().toISOString(),
    listedInstruments: all.length,
    selected: selected.length,
    companies: companies.length,
    withFundamentals: fundamentals.length,
    integrityOk: fundamentals.filter((f) => f.integrity.ok).length,
    atLeastSevenYears: fundamentals.filter((f) => f.years.length >= 7).length,
    gaps,
    errors,
  };
  writeCorpusJson("raw/esef/summary.json", summary);
  console.log(`italy: ${JSON.stringify(summary)}`);
  if (errors.length)
    throw new Error(`italy: ${errors.length} source failures; rerun to resume`);
}
