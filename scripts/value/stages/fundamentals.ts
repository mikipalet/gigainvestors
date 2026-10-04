import {kindFor} from '../../../lib/value/universe';
import {correctCachedAnnualSources} from '../../../lib/value/annual-source-corrections';
import { retainRefreshFacts } from '../../../lib/value/refresh-fundamentals';
import { fetchYahooFundamentals, normalizeYahooFundamentals } from '../../../lib/value/fundamentals-yahoo';
import { mergeIndiaYahoo } from '../../../lib/value/india/filings';
import { statfsSync } from 'node:fs';
import { universeCompanies } from '../../../lib/value/companies';
import { companyExclusion } from '../../../lib/value/fund-exclusion';
import { checkIntegrity } from '../../../lib/value/integrity';
import { fetchEdgar } from '../../../lib/value/reports/edgar';
import { supplementFinancialFacts, type CompanyFacts } from '../../../lib/value/financial-facts';
import { enrichMissingCaps, compareDownloads } from "../../../lib/value/download-order";
import { budgetUsage } from "../../../lib/value/budget";
import { readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { T } from "../../../lib/value/config";
import { callsUsedToday, getFundamentals } from "../../../lib/value/eodhd";
import { createUsdRate } from "../../../lib/value/fx";
import { normalizeEodhd } from "../../../lib/value/normalize-eodhd";
import type { Company, Fundamentals } from "../../../lib/value/types";

interface Options { only?: string[]; limit?: number; force?: boolean; membersFirst?: boolean }

export const MEMBER_FRESHNESS_MS = 90 * 86400000;
export function needsMemberFundamentals(existing: Pick<Fundamentals,'fetchedAt'|'years'>|null, now=Date.now()): boolean {
 const at=Date.parse(existing?.fetchedAt??'');
 return !existing?.years?.length || !Number.isFinite(at) || now-at>MEMBER_FRESHNESS_MS;
}
/** Index members first, then Western access, cap and refresh age. */
export function orderFundamentals(companies: Company[], fetchedAt: ReadonlyMap<string, string>): Company[] {
  const fetchedTime = (id: string) => {
    const timestamp = Date.parse(fetchedAt.get(id) ?? "");
    return Number.isFinite(timestamp) ? timestamp : -Infinity;
  };
  return [...companies].sort((a, b) => Number(Boolean(b.indexes?.length))-Number(Boolean(a.indexes?.length)) || compareDownloads(a, b) || fetchedTime(a.id) - fetchedTime(b.id));
}

export default async function fundamentals(options: Options): Promise<void> {
  const universe = universeCompanies();
  if (!universe.length) throw new Error("Run the universe stage before fundamentals");
  const eligible = universe.filter((company) => (!options.only || options.only.includes(company.id))
    && (!options.membersFirst || company.indexes?.length) && !companyExclusion(company));
  const fetchedAt = new Map<string, string>();
  const overdue = new Set<string>();
  for (const company of eligible) {
    const existing = readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
    if (company.indexes?.length && needsMemberFundamentals(existing)) overdue.add(company.id);
    if (existing?.fetchedAt) fetchedAt.set(company.id, existing.fetchedAt);
  }
  // Rolling refresh always refetches selected companies, including with --force.
  // The member catch-up must not wait for cap enrichment of the entire universe.
  const candidates = options.membersFirst ? eligible.filter(c=>overdue.has(c.id)) : await enrichMissingCaps(eligible.filter(c=>overdue.has(c.id)||(c.source!=='edinet'&&c.source!=='esef')));
  const selected = orderFundamentals(candidates, fetchedAt)
    .sort((a,b)=>Number(overdue.has(b.id))-Number(overdue.has(a.id)) || (overdue.has(a.id)&&overdue.has(b.id) ? Number(fetchedAt.has(a.id))-Number(fetchedAt.has(b.id)) : 0))
    .slice(0, options.limit);
  if (!selected.length) { console.log('fundamentals: 0 due'); return; }
  console.log(`fundamentals selection: eligible=${eligible.length}; dueMembers=${overdue.size}; selected=${selected.length}; membersFirst=${Boolean(options.membersFirst)}`);
  const usdRate = createUsdRate(options);
  let used = selected.some(c => c.exchange !== 'NSE' && c.exchange !== 'BSE') ? await callsUsedToday() : 0;
  let written = 0;
  let attempted = 0;
  let paidAttempts = 0;
  let yahooWritten = 0;
  const failures: Array<{id:string;error:string}>=[];
  for (const company of selected) {
    const disk=statfsSync('/'); if(disk.bavail*disk.bsize<5*1024**3) throw new Error('Disk below 5 GB; stopping');
    const india = company.exchange === 'NSE' || company.exchange === 'BSE';
    if (!india && Math.max(used, budgetUsage().used) + T.budget.fundamentalsCost > T.budget.dailyCalls) {
      console.log("daily EODHD budget reached, resume tomorrow");
      continue;
    }
    if (!india) { used += T.budget.fundamentalsCost; paidAttempts++; }
    attempted++;
    try {
    let raw: unknown;
    let yahoo = india;
    if (!yahoo) {
      try { raw = await getFundamentals(company.id); }
      catch (error) {
        if (!(error instanceof Error) || error.message !== 'EODHD HTTP 404') throw error;
        yahoo = true;
        console.warn(`fundamentals: ${company.id} EODHD 404; falling back to Yahoo annual statements`);
      }
    }
    if (yahoo) raw = await fetchYahooFundamentals(company);
    const { fundamentals: normalized, patch, marketCap } = yahoo
      ? { fundamentals: normalizeYahooFundamentals(raw, company), patch: {} as Partial<Company>, marketCap: { value: null, currency: null } }
      : normalizeEodhd(raw, company.id);
    if (india) {
      const prior = readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
      const official = prior?.years.some(y => Object.values(y.provenance ?? {}).some(p => /^https:\/\/(?:nsearchives|www)\.nseindia\.com\//.test(p.source)));
      if (official && prior) {
        const merged = mergeIndiaYahoo(prior.years, normalized.years);
        normalized.years = merged.years;
        normalized.currency = prior.currency;
        normalized.splits = prior.splits;
        normalized.integrity = { ok: false, reasons: [], notes: [...(prior.integrity?.notes ?? []), ...merged.notes] };
        normalized.integrity = checkIntegrity(normalized);
      }
    }
    // Keep an established issuer identity across a provider's stale predecessor
    // CIK. Newly discovered identities still use the provider as the first lead.
    if(company.cik)patch.cik=company.cik;
    if (patch.cik || company.cik) {
      const cik = String(patch.cik || company.cik).padStart(10, '0');
      try {
        const facts = await (await fetchEdgar(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`)).json() as CompanyFacts;
        writeCorpusJson(`raw/sec-companyfacts/${company.id}.json`, facts);
        if((patch.sector??company.sector)==='Financial Services'){
         try {
          const profile=await (await fetchEdgar(`https://data.sec.gov/submissions/CIK${cik}.json`)).json() as {sic?:string};
          writeCorpusJson(`raw/sec-submissions/${company.id}.json`,profile);
          if(Number(profile.sic)>=6310&&Number(profile.sic)<6400)patch.kind=kindFor({id:company.id,sector:patch.sector??company.sector,industry:patch.industry??company.industry,sic:profile.sic});
         } catch { console.warn(`${company.id}: optional SEC industry classification unavailable`); }
        }
        normalized.years = supplementFinancialFacts(normalized.years, facts);
        normalized.integrity = checkIntegrity(normalized, {source:company.source});
      } catch (error) { console.warn(`${company.id}: optional SEC financial facts unavailable: ${String(error)}`); }
    }
    const retained = retainRefreshFacts(normalized, readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`));
    Object.assign(normalized, retained.fundamentals);
    normalized.years=correctCachedAnnualSources({...company,...patch},normalized.years,raw,readCorpusJson,normalized.splits);
    normalized.currency=normalized.years.at(-1)?.currency??normalized.currency;
    // Validate the usable suffix without deleting retained source observations.
    normalized.integrity = checkIntegrity(structuredClone(normalized), {source:company.source});
    if (retained.snapshot) writeCorpusJson(retained.snapshot.path, retained.snapshot.value);
    const existing = readCorpusJson<Partial<Company>>(`companies/${company.id}.json`);
    const currency = marketCap.currency ?? existing?.currency ?? company.currency;
    const rate = marketCap.value !== null && currency ? await usdRate(currency) : null;
    patch.marketCapUsd = marketCap.value !== null && rate !== null ? marketCap.value * rate : null;
    const knownPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value != null));
    writeCorpusJson(`raw/${yahoo ? "yahoo-fundamentals" : "eodhd"}/${company.id}.json`, raw);
    writeCorpusJson(`companies/${company.id}.json`, { ...company, ...existing, ...knownPatch });
    writeCorpusJson(`fundamentals/${company.id}.json`, normalized);
    written++;
    if (yahoo) yahooWritten++;
    console.log(`${company.id}: ${normalized.years.length} annual periods, integrity ${normalized.integrity.ok ? "ok" : normalized.integrity.reasons.join("; ")}`);
    } catch (error) {
      failures.push({id:company.id,error:error instanceof Error?error.message:String(error)});
      console.warn(`fundamentals: ${company.id} failed; continuing backlog`);
    }
    if (!india && paidAttempts % T.fundamentals.usageSyncCompanies === 0) used = Math.max(used, await callsUsedToday());
  }
  writeCorpusJson(`fundamentals-runs/${new Date().toISOString().replaceAll(':','-')}.json`,{written,attempted,yahooWritten,failures,selected:selected.length,memberCatchup:Boolean(options.membersFirst)});
  console.log(`fundamentals summary: selected=${selected.length}; attempted=${attempted}; written=${written}; yahoo=${yahooWritten}; failed=${failures.length}; deferred=${selected.length-attempted}`);
}
