import { readCorpusJson, writeCorpusJson } from "../corpus";
import type { Company } from "../types";
import { createLimiter, fetchWithRetry } from "../http";

type AnnualForm = "10-K" | "20-F" | "40-F";
interface Filings {
  annual: { form: AnnualForm; url: string; filed: string; period: string } | null;
  proxy: { url: string; filed: string } | null;
}
interface FilingRows {
  form: string[];
  accessionNumber: string[];
  primaryDocument: string[];
  filingDate: string[];
  reportDate: string[];
}
const limit = createLimiter({ perSecond: 8 });

export async function fetchEdgar(url: string): Promise<Response> {
  const response = await fetchWithRetry(url, {
    beforeAttempt: () => limit(async () => {}),
    headers: { "User-Agent": process.env.SEC_USER_AGENT ?? "GigaInvestors value hello@gigainvestors.com" },
  });
  if (!response.ok) throw new Error(`SEC request failed (${response.status})`);
  return response;
}

export async function latestFilings(cik: string): Promise<Filings> {
  if (!/^\d{1,10}$/.test(cik)) throw new Error("Invalid SEC CIK");
  const response = await fetchEdgar(`https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`);
  const data = await response.json() as { filings: { recent: FilingRows; files?: { name: string }[] } };
  const result: Filings = { annual: null, proxy: null };
  function read(rows: FilingRows) {
    for (let index = 0; index < rows.form.length; index++) {
      const rawForm = rows.form[index];
      const form = rawForm === "10-K405" || rawForm === "10-KT" ? "10-K" : rawForm;
      if (!["10-K", "20-F", "40-F", "DEF 14A"].includes(form)) continue;
      const accession = rows.accessionNumber[index];
      const document = rows.primaryDocument[index];
      const filed = rows.filingDate[index];
      if (!accession || !document || !filed) continue;
      const url = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, "")}/${document}`;
      if (form === "DEF 14A") {
        if (!result.proxy || filed > result.proxy.filed) result.proxy = { url, filed };
      } else if (!result.annual || filed > result.annual.filed) {
        result.annual = { form: form as AnnualForm, url, filed, period: rows.reportDate[index] };
      }
    }
  }
  read(data.filings.recent);
  for (const file of data.filings.files ?? []) {
    if (result.annual && result.proxy) break;
    const older = await fetchEdgar(`https://data.sec.gov/submissions/${file.name}`);
    read(await older.json() as FilingRows);
  }
  return result;
}

interface TickerMap { fields: string[]; data: unknown[][] }

/** Resolve only explicit US listings, never a coincidentally identical foreign ticker. */
export async function resolveCik(company: Company): Promise<string | null> {
  if (company.cik) return company.cik;
  const tickers = new Set([company.id, ...company.listings].filter(id => id.endsWith(".US"))
    .map(id => id.slice(0, -3).replaceAll(".", "-").toUpperCase()));
  if (!tickers.size) return null;
  const file = "sec/company-tickers-exchange.json";
  const date = new Date().toISOString().slice(0, 10);
  let cached = readCorpusJson<{ date: string; data: TickerMap }>(file);
  if (cached?.date !== date) {
    const data = await (await fetchEdgar("https://www.sec.gov/files/company_tickers_exchange.json")).json() as TickerMap;
    if (!Array.isArray(data.fields) || !Array.isArray(data.data) || !data.fields.includes("cik") || !data.fields.includes("ticker")) {
      throw new Error("Invalid SEC ticker map");
    }
    cached = { date, data };
    writeCorpusJson(file, cached);
  }
  const tickerIndex = cached.data.fields.indexOf("ticker"), cikIndex = cached.data.fields.indexOf("cik");
  for (const row of cached.data.data) {
    if (!Array.isArray(row) || !tickers.has(String(row[tickerIndex]).toUpperCase())) continue;
    const cik = String(row[cikIndex]);
    if (/^\d{1,10}$/.test(cik)) return String(Number(cik));
  }
  return null;
}
