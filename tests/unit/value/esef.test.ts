import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import os from "node:os";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cutEsefSections, latestEsef } from "@/lib/value/reports/esef";
import reports from "@/scripts/value/stages/reports";
import type { Company } from "@/lib/value/types";

const fixture = (name: string) => name.endsWith(".xhtml")
  ? gunzipSync(readFileSync(path.resolve("tests/fixtures/value/esef", name + ".gz"))).toString()
  : readFileSync(path.resolve("tests/fixtures/value/esef", name), "utf8");
const filing = JSON.parse(fixture("filings-asml.json"));
const url = "https://filings.xbrl.org/724500Y6DUVHQD6OXN27/2025-12-31/ESEF/NL/0/asml-2025-12-31-1-en/reports/asml-2025-12-31-1-en.xhtml";
let directory: string | undefined;
beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); })));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (directory) rmSync(directory, { recursive: true, force: true });
  directory = undefined;
});

it("parses the latest ASML JSON:API report URL, added date and period", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    const request = new URL(input);
    expect(request.origin + request.pathname).toBe("https://filings.xbrl.org/api/filings");
    expect(request.searchParams.get("filter[entity.identifier]")).toBe("724500Y6DUVHQD6OXN27");
    expect(request.searchParams.get("sort")).toBe("-period_end");
    expect(request.searchParams.get("page[size]")).toBe("1");
    return Response.json(filing);
  }));
  expect(await latestEsef("724500Y6DUVHQD6OXN27")).toEqual({ url, filed: "2026-03-04", period: "2025-12-31" });
});

it("returns null for an unmatched LEI and exposes HTTP failures", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: [] })));
  expect(await latestEsef("724500Y6DUVHQD6OXN27")).toBeNull();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));
  await expect(latestEsef("724500Y6DUVHQD6OXN27")).rejects.toThrow(/403/);
});

it("extracts substantive ASML business, risk and compensation sections", () => {
  const result = cutEsefSections(fixture("asml-report.xhtml"));
  for (const key of ["business", "risk", "compensation"] as const) {
    expect(result[key]!.length).toBeGreaterThanOrEqual(1500);
  }
  expect(result.business).toMatch(/lithography/i);
  expect(result.business).not.toMatch(/^Strategy\s+Incentive/);
  expect(result.risk!.slice(0, 300)).toMatch(/risk/i);
  expect(result.risk!.length).toBeGreaterThanOrEqual(3000);
  expect(result.compensation).toContain("Board of Management");
  expect(result.mdna).toBeUndefined();
  for (const section of Object.values(result)) {
    expect(section.replace(/\s+/g, " ")).not.toMatch(/^STRATEGIC REPORT CORPORATE GOVERNANCE/);
  }
  expect(result.risk).toMatch(/risk/i);
  expect(result.compensation).toMatch(/remuneration/i);
  expect(result.business!.length).toBeLessThanOrEqual(32000);
  expect(result.compensation!.length).toBeLessThanOrEqual(16000);
});

const body = (text: string) => text.repeat(120).trim();
const section = (heading: string, text: string) => `<h2>${heading}</h2><p>${text}</p>`;

it("falls back to 8000 tokens after the cover and drops short sections", () => {
  const text = ("x".repeat(98) + "\n\n").repeat(1000);
  expect(cutEsefSections(text)).toEqual({ business: text.slice(2000, 34000) });
  expect(cutEsefSections(section("Risk factors", "Only one section."))).toEqual({});
});

it.each([
  ["Lettre aux actionnaires", "Activités", "Facteurs de risques", "Rémunération"],
  ["Brief an die Aktionäre", "Geschäftsmodell", "Risikobericht", "Vergütungsbericht"],
  ["Carta del presidente", "Business overview", "Principal risks", "Remuneration policy"],
].map((headings) => ({ headings })))("recognizes multilingual headings and stops at the next section: $headings", ({ headings: [letter, business, risk, compensation] }) => {
  const prose = body("Substantive report body. ");
  const result = cutEsefSections([letter, business, risk, compensation].map(h => section(h, prose)).join(""));
  expect(result).toEqual(Object.fromEntries(["letter", "business", "risk", "compensation"].map((key, i) => [key, `${[letter, business, risk, compensation][i]}\n\n${prose}`])));
});

it("does not treat body sentences as headings or choose table-of-contents entries", () => {
  const business = body("We develop precision tools for chipmakers. ");
  const risk = body("Our supply chain has specialized components. ");
  const html = section("Our business", "5") + section("Risk factors", "6")
    + section("Our business", business) + "<p>Our business depends on skilled people.</p>"
    + section("Risk factors", risk);
  const result = cutEsefSections(html);
  expect(result.business).toBe(`Our business\n\n${business}\n\nOur business depends on skilled people.`);
  expect(result.risk).toBe(`Risk factors\n\n${risk}`);
});

const company: Company = {
  id: "ASML.AS", name: "ASML", code: "ASML", exchange: "AS", country: "NL", currency: "EUR",
  isin: "NL0010273215", cik: "937966", lei: "724500Y6DUVHQD6OXN27", edinetCode: null,
  sector: null, industry: null, kind: "operating", listings: ["ASML.AS"],
  marketCapUsd: null, description: "Lithography systems.", source: "eodhd",
};
function setupCorpus(rows: Company[]) {
  directory = mkdtempSync(path.join(os.tmpdir(), "reports-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  writeFileSync(path.join(directory, "universe.jsonl"), rows.map((row) => JSON.stringify(row)).join("\n"));
  return directory;
}

it("routes an EU company with an LEI to ESEF even when it also has a CIK, and resumes", async () => {
  const root = setupCorpus([company]);
  const requests: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    requests.push(input);
    if (input.includes("/api/filings?")) return Response.json(filing);
    if (input === url) return new Response(fixture("asml-report.xhtml"));
    throw new Error(`Unexpected request: ${input}`);
  }));
  await reports({});
  const meta = JSON.parse(readFileSync(path.join(root, "reports/ASML.AS/meta.json"), "utf8"));
  expect(meta).toMatchObject({ kind: "ESEF", url, filed: "2026-03-04", period: "2025-12-31" });
  expect(meta.sections).toEqual(expect.arrayContaining(["business", "risk", "compensation"]));
  await reports({});
  expect(requests.filter((input) => input === url)).toHaveLength(1);
  await reports({ force: true });
  expect(requests.filter((input) => input === url)).toHaveLength(2);
}, 15000);

it("falls back to the description for a UK company without a matched report", async () => {
  const root = setupCorpus([{ ...company, id: "EXAMPLE.LSE", country: "GB", cik: null }]);
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    expect(input).toContain("filings.xbrl.org/api/filings");
    return Response.json({ data: [] });
  }));
  await reports({});
  expect(JSON.parse(readFileSync(path.join(root, "reports/EXAMPLE.LSE/meta.json"), "utf8"))).toMatchObject({ kind: "description", sections: ["business"] });
  expect(readFileSync(path.join(root, "reports/EXAMPLE.LSE/business.txt"), "utf8")).toBe("Lithography systems.");
  expect(existsSync(path.join(root, "reports/ASML.AS"))).toBe(false);
});

it("keeps non-European companies without CIKs on the description path", async () => {
  const root = setupCorpus([{ ...company, id: "EXAMPLE.HK", country: "HK", cik: null }]);
  await reports({});
  expect(JSON.parse(readFileSync(path.join(root, "reports/EXAMPLE.HK/meta.json"), "utf8"))).toMatchObject({ kind: "description" });
});

it("does not label repeated navigation as compensation or an appendix glossary as MD&A", () => {
  const result = cutEsefSections(fixture("asml-report.xhtml"));
  expect(result.compensation).toMatch(/Board of Management remuneration/);
  expect(result.compensation).toMatch(/Remuneration Policy/i);
  expect(result.compensation).not.toContain("Responsible value chain");
  expect(result.mdna ?? "").not.toMatch(/Microchips, such as NAND Flash/);
});

it("matches extended case-insensitive structural headings", () => {
  const prose = body("We build precision tools. ");
  const headings = ["BUSINESS MODEL AND VALUE CREATION", "Risk management and internal control", "Remuneration report for 2025"];
  expect(cutEsefSections(headings.map(h => section(h, prose)).join(""))).toEqual({
    business: `${headings[0]}\n\n${prose}`, risk: `${headings[1]}\n\n${prose}`, compensation: `${headings[2]}\n\n${prose}`,
  });
});

it("fills missing business even with multiple other sections and skips contents", () => {
  const risk = body("Actual risk prose. ");
  const pay = body("Actual pay prose. ");
  const html = "<p>Cover</p><p>Table of contents</p>" + section("Risk factors", "5") + section("Remuneration report", "6")
    + section("Risk management and internal control", risk) + section("Remuneration report", pay);
  const sections = cutEsefSections(html);
  expect(sections.business).toBe(`${risk}\n\nRemuneration report\n\n${pay}`);
  expect(sections.risk).toContain(risk);
  expect(sections.compensation).toContain(pay);
});

it("ignores long headings and wrapped body mentions even when short", () => {
  const prose = body("Actual risk. ");
  const html = `<h2>Business model and value creation ${"operations ".repeat(20)}</h2>`
    + section("Risk factors", prose) + "<p>form the Management Report within the meaning</p><p>of Section 2:391.</p>"
    + section("Remuneration policy", body("Actual pay. "));
  const sections = cutEsefSections(html);
  expect(sections.mdna).toBeUndefined();
  expect(sections.business).toMatch(/^Actual risk/);
});

it("skips the first 2000 cover characters when no heading matches", () => {
  const cover = "C".repeat(2000);
  const text = "Unlabelled operations. ".repeat(2000);
  expect(cutEsefSections(cover + text)).toEqual({ business: text.slice(0, 32000) });
});

it("uses class and inline typography, inherited styles, and block spans", () => {
  const prose = body("Precision lithography tools. ");
  const html = `<style>.body {font-size:10pt} .title {font-size:16pt} p.bold {font-weight:600} .block {display:block}</style>
    <div class="body"><div class="title"><span>Business model and value creation</span></div><p>${prose}</p>
    <p class="bold">Risk management and internal control</p><p>${prose}</p>
    <span class="block" style="font-weight:700">Remuneration report</span><p>${prose}</p></div>`;
  const result = cutEsefSections(html);
  expect(result.business).toBe(`Business model and value creation\n\n${prose}`);
  expect(result.risk).toBe(`Risk management and internal control\n\n${prose}`);
  expect(result.compensation).toBe(`Remuneration report\n\n${prose}`);
});

it("ignores repeated running headings, inline fragments and punctuation", () => {
  const prose = body("Real operations and lithography. ");
  const html = section("Our business", prose)
    + Array.from({length:4}, () => `<div style="font-weight:bold">Management report</div><p>${prose}</p>`).join("")
    + `<p><span style="font-weight:700">Financial review</span> is discussed elsewhere.</p>`
    + `<p style="font-weight:700">Financial review;</p><p>${prose}</p>`;
  const result = cutEsefSections(html);
  expect(result.mdna).toBeUndefined();
  expect(result.business).toContain(prose);
});

it("prefers a large business heading to a small bold graphic label", () => {
  const prose = body("We build lithography systems. ");
  const result = cutEsefSections(`<div style="font-size:24pt">Our business strategy</div><p>${prose}</p>`
    + section("Risk factors", body("Risk disclosure body. "))
    + `<div style="font-weight:600">Strategy</div><p>${body("Incentive measures and pay. ")}</p>`);
  expect(result.business).toBe(`Our business strategy\n\n${prose}`);
});

it("requires 1500 body characters, excluding the heading", () => {
  expect(cutEsefSections(section("Risk factors", "r".repeat(1499)))).toEqual({});
  expect(cutEsefSections(section("Risk factors", "r".repeat(1500))).risk).toBe(`Risk factors\n\n${"r".repeat(1500)}`);
});

it("spaces metadata and report fetches through the same three-per-second limiter", async () => {
  vi.useFakeTimers();
  vi.resetModules();
  try {
    const { latestEsef: limitedLatest, fetchEsef } = await import("@/lib/value/reports/esef");
    const starts: number[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      starts.push(Date.now());
      return input.includes("/api/filings?") ? Response.json(filing) : new Response("Report");
    }));
    const requests = Promise.all([limitedLatest("one"), fetchEsef(url), limitedLatest("two"), fetchEsef(url)]);
    await vi.runAllTimersAsync();
    await requests;
    expect(starts).toHaveLength(4);
    for (let index = 1; index < starts.length; index++) {
      expect(starts[index] - starts[index - 1]).toBeGreaterThanOrEqual(333);
    }
    expect(starts[3] - starts[0]).toBeGreaterThanOrEqual(999);
  } finally {
    vi.useRealTimers();
  }
});
