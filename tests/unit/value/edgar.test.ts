import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { htmlToText } from "@/lib/value/reports/html-to-text";
import { cutSections, truncateTokens } from "@/lib/value/reports/cut-sections";
import { latestFilings } from "@/lib/value/reports/edgar";
import reports from "@/scripts/value/stages/reports";
import type { Company, ReportMeta } from "@/lib/value/types";

const fixture = (name: string) => readFileSync(path.resolve("tests/fixtures/value/edgar", name), "utf8");
const submissions = JSON.parse(fixture("submissions-KO.json"));
const annualUrl = "https://www.sec.gov/Archives/edgar/data/21344/000162828026010047/ko-20251231.htm";
const proxyUrl = "https://www.sec.gov/Archives/edgar/data/21344/000110465926028215/ko-20260429xdef14a.htm";
let directory: string | undefined;
beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); })));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (directory) rmSync(directory, { recursive: true, force: true });
  directory = undefined;
});

it("removes hidden markup and decodes entities while preserving paragraphs", () => {
  expect(htmlToText('<style>bad</style><script>bad</script><ix:header><ix:hidden>bad</ix:hidden></ix:header><div hidden>bad</div><p>Hello &amp; <b>world</b>&nbsp;&#169;</p><p>A&#x2019;s &lt; B</p>'))
    .toBe("Hello & world ©\n\nA’s < B");
});

it("extracts the KO annual report body instead of its table of contents", () => {
  const result = cutSections({ text: htmlToText(fixture("ko-10k.htm")), form: "10-K" });
  expect(result.business).toMatch(/^Item\s+1[.\s]+Business/i);
  expect(result.business!.length).toBeGreaterThanOrEqual(5000);
  expect(result.business).toContain("The Coca-Cola Company");
  expect(result.business).toMatch(/bottling/i);
  expect(result.risk).toMatch(/Risk Factors/i);
  expect(result.mdna).toMatch(/Management[’']s Discussion/i);
  expect(result.capital).toMatch(/Market for Registrant/i);
  expect(result.notes).toMatch(/Notes to Consolidated Financial Statements/i);
  expect(result.notes).toContain("NOTE 1: BUSINESS AND SUMMARY");
  expect(result.notes).not.toContain("(2)Financial Statement Schedules");
  expect(result.auditor).toMatch(/Report of Independent Registered Public Accounting Firm/i);
  expect(result.auditor).toContain("We have audited");
  expect(result.auditor).toContain("To the Shareowners");
  expect(result.letter).toBeUndefined();
});

it("extracts the proxy compensation discussion", () => {
  const result = cutSections({ text: htmlToText(fixture("def14a-KO.htm")), form: "DEF 14A" });
  expect(result.compensation).toMatch(/Compensation Discussion/i);
  expect(result.compensation!.length).toBeGreaterThan(500);
});

it("reads Item 4 business in the recorded TSM 20-F", () => {
  const result = cutSections({ text: htmlToText(fixture("tsm-20f.htm")), form: "20-F" });
  expect(result.business).toMatch(/^ITEM\s+4/i);
  expect(result.business).toMatch(/semiconductor/i);
  expect(result.risk).toMatch(/^Risk Factors/);
  expect(result.compensation).toMatch(/^Compensation/);
  expect(result.compensation).toContain("According to our Articles of Incorporation");
});

it("takes the last substantial item pair and stops at adjacent items", () => {
  const body = "Actual operations. ".repeat(50);
  const result = cutSections({ text: `Item 1. Business\n\nTOC\n\nItem 1A. Risk Factors\n\nItem 1. Business\n\n${body}\n\nItem 1A. Risk Factors\n\n${body}\n\nItem 1B. Other\n\nexcluded`, form: "10-K" });
  expect(result.business).toBe(`Item 1. Business\n\n${body.trim()}`);
  expect(result.risk).not.toContain("excluded");
});

it("recognizes 20-F dotted and separated letter subitems", () => {
  const body = "Substantive report prose. ".repeat(30);
  const text = [`Item 3.D. Risk Factors`, body, "Item 4. Information on the Company", body,
    "Item 5. Operating and Financial Review", body, "Item 6.B. Compensation", body,
    "Item 6.C. Board Practices", body, "Item 16 E. Purchases of Equity Securities", body, "Item 16F. Change in Auditor"].join("\n\n");
  const result = cutSections({ text, form: "20-F" });
  for (const key of ["business", "risk", "mdna", "compensation", "capital"] as const) expect(result[key]).toContain("Substantive report prose");
  expect(result.compensation).not.toContain("Board Practices");
  expect(result.capital).not.toContain("Change in Auditor");
});

describe("truncateTokens", () => {
  it("caps Latin text at a paragraph boundary", () => {
    const result = truncateTokens(("x".repeat(98) + "\n\n").repeat(1000), 1000);
    expect(result.length).toBeLessThanOrEqual(4000);
    expect(result.length).toBeGreaterThan(3800);
    expect(result.endsWith("\n\n")).toBe(true);
  });
  it("uses a conservative CJK budget and handles a single long paragraph", () => {
    expect(truncateTokens("日".repeat(5000), 1000).length).toBeLessThanOrEqual(1000);
    expect(truncateTokens("x".repeat(10000), 1000).length).toBe(4000);
    expect(truncateTokens("short", 1000)).toBe("short");
    expect(truncateTokens("text", 0)).toBe("");
  });
});

it("selects latest annual and proxy filings with SEC URLs and contact headers", async () => {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    expect(url).toBe("https://data.sec.gov/submissions/CIK0000021344.json");
    expect(new Headers(init?.headers).get("User-Agent")).toBe("GigaInvestors value hello@gigainvestors.com");
    return Response.json(submissions);
  });
  vi.stubGlobal("fetch", fetch);
  expect(await latestFilings("21344")).toEqual({
    annual: { form: "10-K", url: annualUrl, filed: "2026-02-20", period: "2025-12-31" },
    proxy: { url: proxyUrl, filed: "2026-03-16" },
  });
});

it("finds an annual filing in older submission pages when recent filings have none", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("CIK0000021344.json")) return Response.json({ filings: { recent: { form: [] }, files: [{ name: "CIK0000021344-submissions-001.json" }] } });
    expect(url).toBe("https://data.sec.gov/submissions/CIK0000021344-submissions-001.json");
    return Response.json(submissions.filings.recent);
  }));
  expect((await latestFilings("21344")).annual?.url).toBe(annualUrl);
});

it("returns absent filings and fails on HTTP errors instead of concealing them", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ filings: { recent: { form: [] } } })));
  expect(await latestFilings("21344")).toEqual({ annual: null, proxy: null });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));
  await expect(latestFilings("21344")).rejects.toThrow(/403/);
});

const company: Company = {
  id: "KO.US", name: "Coca-Cola", code: "KO", exchange: "US", country: "US", currency: "USD",
  isin: null, cik: "21344", lei: null, edinetCode: null, sector: null, industry: null,
  kind: "operating", listings: ["KO.US"], marketCapUsd: null, description: "Beverage business.", source: "eodhd",
};
function setupCorpus(rows: Company[]) {
  directory = mkdtempSync(path.resolve("tests/fixtures/value/reports-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  writeFileSync(path.join(directory, "universe.jsonl"), rows.map((row) => JSON.stringify(row)).join("\n"));
  return directory;
}

it("writes filing sections, skips unchanged downloads, and repairs missing outputs", async () => {
  const root = setupCorpus([company]);
  const downloads: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("submissions/")) return Response.json(submissions);
    downloads.push(url);
    if (url === annualUrl) return new Response(fixture("ko-10k.htm"));
    if (url === proxyUrl) return new Response(fixture("def14a-KO.htm"));
    throw new Error(`Unexpected URL: ${url}`);
  }));
  await reports({ only: ["KO.US"], limit: 1 });
  const meta = JSON.parse(readFileSync(path.join(root, "reports/KO.US/meta.json"), "utf8")) as ReportMeta;
  expect(meta).toMatchObject({ id: "KO.US", kind: "10-K", period: "2025-12-31", url: annualUrl });
  expect(meta.sections).toContain("compensation");
  expect(readFileSync(path.join(root, "reports/KO.US/business.txt"), "utf8")).toContain("bottling");
  await reports({});
  expect(downloads).toHaveLength(2);
  rmSync(path.join(root, "reports/KO.US/business.txt"));
  await reports({});
  expect(downloads).toHaveLength(4);
  expect(existsSync(path.join(root, "reports/KO.US/business.txt"))).toBe(true);
});

it("falls back to description, applies filters, and updates changed descriptions", async () => {
  const fallback = { ...company, cik: null };
  const root = setupCorpus([fallback, { ...fallback, id: "OTHER.US" }]);
  await reports({ only: ["KO.US"] });
  expect(JSON.parse(readFileSync(path.join(root, "reports/KO.US/meta.json"), "utf8"))).toMatchObject({ kind: "description", sections: ["business"], url: null });
  expect(existsSync(path.join(root, "reports/OTHER.US"))).toBe(false);
  writeFileSync(path.join(root, "universe.jsonl"), JSON.stringify({ ...fallback, description: "Updated description" }));
  await reports({});
  expect(readFileSync(path.join(root, "reports/KO.US/business.txt"), "utf8")).toBe("Updated description");
});
