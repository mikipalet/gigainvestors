vi.mock("@/lib/value/reports/transport",()=>({reportRequest:(url:string,init:RequestInit)=>fetch(url,init)}));
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadCompanies } from "@/lib/value/companies";
import { appendJsonl, corpusPath, readCorpusJson, writeCorpusJson } from "@/lib/value/corpus";
import type { Company } from "@/lib/value/types";
import reports from "@/scripts/value/stages/reports";

let directory: string;
const company = (id: string): Company => ({
  id, name: id, code: id.split(".")[0], exchange: "TW", country: "TW", currency: "TWD",
  isin: null, cik: null, lei: null, edinetCode: null, sector: null, industry: null,
  kind: "operating", listings: [id], marketCapUsd: null, description: null, source: "eodhd",
});

beforeEach(() => {
  directory = mkdtempSync(path.join(os.tmpdir(), "value-companies-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.stubGlobal("fetch", () => { throw new Error("Unexpected network request"); });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  rmSync(directory, { recursive: true, force: true });
});

it("overlays enriched fields without replacing non-null universe values with null", () => {
  appendJsonl("universe.jsonl", { ...company("2330.TW"), name: "TSMC", isin: "TW0002330008", marketCapUsd: 100 });
  writeCorpusJson("companies/2330.TW.json", {
    name: null, isin: null, cik: "123", lei: "lei", description: "Makes chips",
    sector: "Technology", industry: "Semiconductors", kind: "bank", marketCapUsd: 0,
  });
  expect(loadCompanies({})).toEqual([{
    ...company("2330.TW"), name: "TSMC", isin: "TW0002330008", cik: "123", lei: "lei",
    description: "Makes chips", sector: "Technology", industry: "Semiconductors", kind: "bank", marketCapUsd: 0,
  }]);
});

it("keeps universe order, includes unenriched rows, and filters before limiting", () => {
  for (const id of ["B.TW", "A.TW", "C.TW"]) appendJsonl("universe.jsonl", company(id));
  writeCorpusJson("companies/ORPHAN.TW.json", company("ORPHAN.TW"));
  expect(loadCompanies({})).toEqual([company("B.TW"), company("A.TW"), company("C.TW")]);
  expect(loadCompanies({ only: ["C.TW", "A.TW"], limit: 1 })).toEqual([company("A.TW")]);
  expect(loadCompanies({ limit: 0 })).toEqual([]);
  expect(loadCompanies({ only: [] })).toEqual([]);
});

it("returns no companies when the universe is missing", () => {
  expect(loadCompanies({})).toEqual([]);
});
it('loads supplemental members and keeps current membership over stale enrichment',()=>{
 appendJsonl('universe.jsonl',company('A.TW'));
 writeCorpusJson('index-membership/latest.json',{memberships:{'A.TW':['Current'],'B.TW':['New']},supplementalCompanies:[company('B.TW')]});
 writeCorpusJson('companies/B.TW.json',{indexes:['Old'],name:'Enriched B'});
 expect(loadCompanies({only:['B.TW']})).toMatchObject([{id:'B.TW',name:'Enriched B',indexes:['New']}]);
});

it("writes enriched descriptions to business.txt for description-only reports", async () => {
  appendJsonl("universe.jsonl", company("2330.TW"));
  writeCorpusJson("companies/2330.TW.json", { description: "Makes chips for customers worldwide." });
  await reports({ only: ["2330.TW"], force: true });
  expect(readCorpusJson("reports/2330.TW/meta.json")).toMatchObject({ kind: "description", sections: ["business"] });
  expect(readFileSync(corpusPath("reports/2330.TW/business.txt"), "utf8")).toBe("Makes chips for customers worldwide.");
});

it("C4 shared company loading and reports skip bad IDs and allow ampersands", async () => {
  const ids = ["PE&OLES.MX", "F&D.BK", "L&E.BK", "C&G.XNAI"];
  appendJsonl("universe.jsonl", company("../bad"));
  for (const id of ids) appendJsonl("universe.jsonl", { ...company(id), description: "Makes chips." });
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    expect(loadCompanies({}).map(row => row.id)).toEqual(ids);
    await reports({});
    for (const id of ids) expect(readCorpusJson(`reports/${id}/meta.json`)).toMatchObject({ id, kind: "description" });
    expect(log.mock.calls.flat().join(" ")).toMatch(/skipp.*bad/i);
  } finally { log.mockRestore(); }
});

it.each(["", ".", "..", "bad/id", "bad\\id", "bad id", "bad$id", null])("C4 skips malformed ID %j before reading paths", id => {
  appendJsonl("universe.jsonl", { ...company("BAD.TW"), id });
  appendJsonl("universe.jsonl", company("GOOD.TW"));
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  try { expect(loadCompanies({ limit: 1 }).map(row => row.id)).toEqual(["GOOD.TW"]); }
  finally { log.mockRestore(); }
});

it('reports continues with the universe description when company enrichment is malformed', async () => {
  const { writeFileSync } = await import('node:fs');
  for (const id of ['BAD.TW', 'A.TW', 'B.TW', 'C.TW', 'D.TW']) appendJsonl('universe.jsonl', { ...company(id), description: 'Makes chips.' });
  writeCorpusJson('companies/BAD.TW.json', {});
  writeFileSync(corpusPath('companies/BAD.TW.json'), '{broken');
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await reports({});
    expect(readFileSync(corpusPath('reports/BAD.TW/business.txt'), 'utf8')).toBe('Makes chips.');
    expect(readCorpusJson('reports/D.TW/meta.json')).toMatchObject({ kind: 'description' });
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/^BAD.TW: /));
  } finally { error.mockRestore(); }
});

it('spends a limited report run on Western access first, then market cap',async()=>{
 writeCorpusJson('sec/company-tickers-exchange.json',{date:new Date().toISOString().slice(0,10),data:{fields:['cik','ticker'],data:[]}});
 for(const c of [{...company('BIG.TW'),marketCapUsd:1e12},{...company('SMALL.AS'),marketCapUsd:10},{...company('ADR.TW'),listings:['ADR.TW','ADRYY.US'],marketCapUsd:100}]) appendJsonl('universe.jsonl',{...c,description:'Makes chips.'});
 await reports({limit:1});
 expect(readCorpusJson('reports/ADR.TW/meta.json')).toMatchObject({id:'ADR.TW'});
 expect(readCorpusJson('reports/BIG.TW/meta.json')).toBeNull();
 expect(readCorpusJson('reports/SMALL.AS/meta.json')).toBeNull();
});
