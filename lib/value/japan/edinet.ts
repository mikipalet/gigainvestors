import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { corpusPath, readCorpusJson, writeCorpusJson } from "../corpus";
import { T } from "../config";
import { createLimiter, fetchWithRetry, pool } from "../http";

export interface EdinetDocument {
  docID: string; edinetCode: string; secCode: string; filerName: string;
  docTypeCode: string; periodStart: string; periodEnd: string; submitDateTime: string;
  csvFlag: string; withdrawalStatus: string; disclosureStatus: string;
}
export interface DocumentDay { metadata: { status: string }; results: EdinetDocument[] }
const limiter = createLimiter({ perSecond: T.edinet.perSecond / (Number(process.env.VALUE_SOURCE_WORKERS)||1) });
async function request(resource: string, query: Record<string, string>): Promise<Response> {
  const key = process.env.EDINET_API_KEY;
  if (!key) throw new Error("EDINET_API_KEY missing");
  const url = new URL(`https://api.edinet-fsa.go.jp/api/v2/${resource}`);
  url.search = new URLSearchParams({ ...query, "Subscription-Key": key }).toString();
  // Never include the credential-bearing URL (or fetch cause) in errors.
  let response: Response;
  try { response = await fetchWithRetry(url.href, { beforeAttempt: () => limiter(async () => {}), signal: AbortSignal.timeout(T.edinet.timeoutMs) }); }
  catch { throw new Error(`EDINET ${resource}: request failed`); }
  if (!response.ok) throw new Error(`EDINET ${resource}: HTTP ${response.status}`);
  return response;
}
export async function listDocuments(date: string): Promise<DocumentDay> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid EDINET date");
  const data = await (await request("documents.json", { date, type: "2" })).json() as DocumentDay;
  if (data.metadata?.status !== "200" || !Array.isArray(data.results)) throw new Error(`EDINET documents ${date}: invalid response`);
  return data;
}
export function annualReportDocuments(data: Pick<DocumentDay, "results">): EdinetDocument[] { return reportDocuments(data, "120"); }
export function semiAnnualReportDocuments(data: Pick<DocumentDay, "results">): EdinetDocument[] { return reportDocuments(data, "160"); }
function reportDocuments(data: Pick<DocumentDay, "results">, type: string): EdinetDocument[] {
  return data.results.filter(d => d.docTypeCode === type && d.secCode !== "00000" && /^[0-9A-Z]{4}0$/.test(d.secCode ?? "")
    && d.csvFlag === "1" && d.withdrawalStatus === "0" && d.disclosureStatus === "0");
}
export async function annualReports({ from, to }: { from: string; to: string }): Promise<EdinetDocument[]> {
  const days: string[] = [];
  for (let date = new Date(`${from}T00:00:00Z`); date.toISOString().slice(0, 10) <= to; date.setUTCDate(date.getUTCDate() + 1)) days.push(date.toISOString().slice(0, 10));
  let completed = 0;
  const reports = await pool({ items: days, concurrency: T.edinet.concurrency, run: async date => {
    const file = `raw/edinet/days/${date}.json`;
    // Refresh today; reuse recorded historical day snapshots when resuming.
    const data = (date < new Date().toISOString().slice(0, 10) ? readCorpusJson<DocumentDay>(file) : null) ?? await listDocuments(date);
    writeCorpusJson(file, data);
    if (++completed % 100 === 0) console.log(`japan: ${completed}/${days.length} filing days`);
    return annualReportDocuments(data);
  } });
  return reports.flat().sort((a,b) => a.submitDateTime.localeCompare(b.submitDateTime) || a.docID.localeCompare(b.docID));
}
/** Read only CSV entries to stdout, never extract provider paths into the filesystem. */
export function csvFilesFromZip(file: string): string[] {
  const names = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" }).trim().split(/\r?\n/).filter(name => /\.csv$/i.test(name));
  if (!names.length) throw new Error("EDINET ZIP contains no CSV files");
  return names.map(name => execFileSync("unzip", ["-p", file, name], { maxBuffer: T.edinet.maxCsvBytes }).toString("utf16le"));
}
export async function downloadCsv(docId: string): Promise<string[]> {
  if (!/^S[0-9A-Z]+$/.test(docId)) throw new Error("Invalid EDINET document ID");
  const file = corpusPath(`raw/edinet/csv/${docId}.zip`);
  if (!existsSync(file)) {
    const data = Buffer.from(await (await request(`documents/${docId}`, { type: "5" })).arrayBuffer());
    if (data.readUInt16LE(0) !== 0x4b50) throw new Error(`EDINET ${docId}: not a ZIP`);
    mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    writeFileSync(temporary, data); renameSync(temporary, file);
  }
  return csvFilesFromZip(file);
}
