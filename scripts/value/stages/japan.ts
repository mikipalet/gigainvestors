import { retainRefreshFacts } from '../../../lib/value/refresh-fundamentals';
import { cachedInterimDocuments, latestInterim, applyEdinetInterim } from "../../../lib/value/japan/cached-interim";
import { reconcileEdinetShares } from "../../../lib/value/japan/shares";
import { CALIBRATION } from "../../../lib/value/calibration";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { T } from "../../../lib/value/config";
import { loadCompanies } from "../../../lib/value/companies";
import { corpusPath, readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { checkIntegrity } from "../../../lib/value/integrity";
import { readPriceHistory } from "../../../lib/value/price-history";
import { pool } from "../../../lib/value/http";
import { annualReports, annualReportDocuments, downloadCsv, type DocumentDay, type EdinetDocument } from "../../../lib/value/japan/edinet";
import { mergeJapaneseCompanies, type JapaneseIssuer } from "../../../lib/value/japan/companies";
import { edinetFact, mergeYears, parseEdinetCsv, sectionsFromEdinet, yearsFromEdinet } from "../../../lib/value/japan/xbrl-csv";
import type { Company, Fundamentals, ReportMeta, SectionKey, Year } from "../../../lib/value/types";

interface Options { only?: string[]; limit?: number; force?: boolean; from?: string; to?: string }
export default async function japan(options: Options): Promise<void> {
  const now = new Date(); const start = new Date(now); start.setUTCFullYear(start.getUTCFullYear() - T.edinet.filingYears);
  if ((options.from === undefined) !== (options.to === undefined)) throw new Error("Japan date range requires both --from and --to");
  const from = options.from ?? start.toISOString().slice(0,10);
  const to = options.to ?? now.toISOString().slice(0,10);
  for (const date of [from,to]) {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date)
      throw new Error(`Invalid Japan filing date: ${date}`);
  }
  if (from > to) throw new Error("Japan date range must have --from <= --to");
  if (!process.env.EDINET_API_KEY) { console.log("EDINET_API_KEY missing, Japan skipped"); return; }
  const documents = await annualReports({from,to});
  const groups = new Map<string, EdinetDocument[]>();
  for (const doc of documents) {
    const id = `${doc.secCode.slice(0,4)}.JP`;
    if (options.only && !options.only.includes(id)) continue;
    groups.set(id,[...groups.get(id) ?? [],doc]);
  }
  // Include all previously recorded filings for selected issuers. Replaying the
  // complete chronology preserves later restatements regardless of run order,
  // and recovers years that an earlier integrity check may have truncated.
  const days = corpusPath("raw/edinet/days");
  for (const file of existsSync(days) ? readdirSync(days).sort() : []) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(file) || (file.slice(0,10) >= from && file.slice(0,10) <= to)) continue;
    const day = readCorpusJson<DocumentDay>(`raw/edinet/days/${file}`);
    if (day?.metadata.status !== "200" || !Array.isArray(day.results)) continue;
    for (const doc of annualReportDocuments(day)) groups.get(`${doc.secCode.slice(0,4)}.JP`)?.push(doc);
  }
  for (const [id,docs] of groups) groups.set(id,[...new Map(docs.map(doc=>[doc.docID,doc])).values()]
    .sort((a,b)=>a.submitDateTime.localeCompare(b.submitDateTime) || a.docID.localeCompare(b.docID)));
  const interimDocuments = cachedInterimDocuments();
  const calibration = new Set(CALIBRATION.map(entry => entry.id));
  const selected = [...groups.entries()].sort(([a],[b]) => Number(calibration.has(b)) - Number(calibration.has(a)) || a.localeCompare(b)).slice(0,options.limit);
  console.log(`japan: ${documents.length} annual reports; ${selected.length} issuers selected`);
  const initial = loadCompanies({});
  const initialIds = new Set(initial.map(c => c.id));
  if (!readCorpusJson("raw/edinet/universe-before-merge.json")) writeCorpusJson("raw/edinet/universe-before-merge.json", initial);
  const incoming: JapaneseIssuer[] = []; const errors: Array<{id:string;error:string}> = [];
  function checkpoint(): void {
    // Each checkpoint rereads the universe to retain concurrent provider enrichments.
    const result = mergeJapaneseCompanies({ existing: loadCompanies({}), incoming });
    const previous = readCorpusJson<Array<{from:string;to:string}>>("raw/edinet/merged-listings.json") ?? [];
    const merged = [...new Map([...previous,...result.merged].map(m=>[m.from,m])).values()];
    // Audit first: a crash must not remove an ADR without leaving its identity mapping.
    writeCorpusJson("raw/edinet/merged-listings.json",merged);
    const file = corpusPath("universe.jsonl");
    writeFileSync(`${file}.${process.pid}.tmp`,result.companies.map(c=>JSON.stringify(c)).join("\n")+"\n");renameSync(`${file}.${process.pid}.tmp`,file);
    const byId = new Map(result.companies.map(c => [c.id,c]));
    for (const issuer of incoming) writeCorpusJson(`companies/${issuer.company.id}.json`,byId.get(issuer.company.id));
  }
  let completed = 0;
  await pool({ items:selected, concurrency:T.edinet.concurrency, run:async ([id,docs]) => {
    try {
      const fingerprint = createHash("sha256").update(JSON.stringify({version:8,docs,interim:interimDocuments.get(id)})).digest("hex");
      const cache = readCorpusJson<{ fingerprint:string; issuer:JapaneseIssuer }>(`raw/edinet/issuers/${id}.json`);
      const meta = readCorpusJson<ReportMeta>(`reports/${id}/meta.json`);
      if (!options.force && cache?.fingerprint === fingerprint && readCorpusJson(`fundamentals/${id}.json`) && meta?.kind === "EDINET"
        && meta.sections.every(key => existsSync(corpusPath(`reports/${id}/${key}.txt`)))) { incoming.push(cache.issuer); return; }
      let years: Year[] = []; let latestRows: ReturnType<typeof parseEdinetCsv> = [];
      for (const doc of docs) {
        const rows = (await downloadCsv(doc.docID)).flatMap(parseEdinetCsv);
        years = mergeYears(years, yearsFromEdinet(rows)); latestRows = rows;
      }
      if (!years.length) throw new Error("No annual financial facts found");
      const latest = docs.at(-1)!;
      const prices = readPriceHistory(id);
      years = years.map(year => reconcileEdinetShares(year, prices));
      const fundamentals: Fundamentals = {id,currency:"JPY",years:years.map(year => ({ ...year })),integrity:{ok:false,reasons:[]},fetchedAt:now.toISOString()};
      const interim = latestInterim(fundamentals, interimDocuments.get(id) ?? []);
      if (interim) applyEdinetInterim(fundamentals, interim, (await downloadCsv(interim.docID)).flatMap(parseEdinetCsv), prices);
      const retained = retainRefreshFacts(fundamentals, readCorpusJson<Fundamentals>(`fundamentals/${id}.json`));
      Object.assign(fundamentals, retained.fundamentals);
      // Persist source years; integrity validates a working copy's usable suffix.
      fundamentals.integrity = checkIntegrity(structuredClone(fundamentals), { source: "edinet", priceHistory: readPriceHistory(id) });
      if (retained.snapshot) writeCorpusJson(retained.snapshot.path, retained.snapshot.value);
      writeCorpusJson(`fundamentals/${id}.json`,fundamentals);
      const industryCode = edinetFact(latestRows,"IndustryCodeWhenConsolidatedFinancialStatementsArePreparedInAccordanceWithIndustrySpecificRegulationsDEI");
      const company: Company = { id,code:id.slice(0,-3),exchange:"JP",country:"JP",currency:"JPY",name:latest.filerName,
        isin:null,cik:null,lei:null,edinetCode:latest.edinetCode,sector:null,industry:null,
        kind:industryCode === "bk1" || industryCode === "bk2" ? "bank" : industryCode === "in1" || industryCode === "in2" ? "insurer" : "operating",
        listings:[id],marketCapUsd:null,description:null,source:"edinet" };
      const sections = sectionsFromEdinet(latestRows); const keys = Object.keys(sections) as SectionKey[];
      const directory = corpusPath(`reports/${id}`); mkdirSync(directory,{recursive:true});
      for (const key of keys) { const file = `${directory}/${key}.txt`;writeFileSync(`${file}.tmp`,sections[key]!);renameSync(`${file}.tmp`,file); }
      for (const key of meta?.sections ?? []) if (!keys.includes(key)) rmSync(`${directory}/${key}.txt`,{force:true});
      writeCorpusJson(`reports/${id}/meta.json`,{id,kind:"EDINET",url:`https://disclosure2dl.edinet-fsa.go.jp/searchdocument/pdf/${latest.docID}.pdf`,filed:latest.submitDateTime.slice(0,10),period:latest.periodEnd,sections:keys} satisfies ReportMeta);
      const issuer: JapaneseIssuer = {company,englishName:edinetFact(latestRows,"FilerNameInEnglishDEI") ?? edinetFact(latestRows,"CompanyNameInEnglishCoverPage")};
      incoming.push(issuer);writeCorpusJson(`raw/edinet/issuers/${id}.json`,{fingerprint,issuer,years,fetchedAt:fundamentals.fetchedAt});
    } catch(error) { const message=error instanceof Error ? error.message : "Import failed"; errors.push({id,error:message});console.error(`japan: ${id}: ${message}`); }
    finally {if (++completed % T.edinet.checkpointCompanies === 0) { checkpoint(); console.log(`japan: ${completed}/${selected.length} issuers`); }}
  } });
  checkpoint();
  const created = incoming.filter(i=>!initialIds.has(i.company.id)).length;
  const merged = readCorpusJson<Array<{from:string;to:string}>>("raw/edinet/merged-listings.json") ?? [];
  const ok = incoming.filter(i=>readCorpusJson<Fundamentals>(`fundamentals/${i.company.id}.json`)?.integrity.ok).length;
  const summary = {from,to,annualReports:documents.length,companies:incoming.length,created,integrityOk:ok,integrityOkPercent:incoming.length ? 100*ok/incoming.length : 0,mergedListings:merged.length,errors};
  writeCorpusJson("raw/edinet/summary.json",summary);console.log(`japan: ${JSON.stringify(summary)}`);
  if (errors.length) throw new Error(`japan: ${errors.length} issuers failed; rerun to resume`);
}
