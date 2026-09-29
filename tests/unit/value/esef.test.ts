import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cutEsefSections, latestEsef } from "@/lib/value/reports/esef";
import { htmlToText } from "@/lib/value/reports/html-to-text";
import reports from "@/scripts/value/stages/reports";
import type { Company } from "@/lib/value/types";

const fixture = (name: string) => readFileSync(path.resolve("tests/fixtures/value/esef", name), "utf8");
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
  const result = cutEsefSections(htmlToText(fixture("asml-report.xhtml")));
  for (const key of ["business", "risk", "compensation"] as const) {
    expect(result[key]!.length).toBeGreaterThan(500);
  }
  expect(result.business).toMatch(/ASML|lithography/i);
  expect(result.risk).toMatch(/risk/i);
  expect(result.compensation).toMatch(/remuneration/i);
  expect(result.business!.length).toBeLessThanOrEqual(32000);
  expect(result.compensation!.length).toBeLessThanOrEqual(16000);
});

it("falls back to 8000 tokens after the cover or first recognized heading", () => {
  const text = ("x".repeat(98) + "\n\n").repeat(1000);
  expect(cutEsefSections(text)).toEqual({ business: text.slice(2000, 34000) });
  const single = "Risk factors\n\nOnly one section.\n\nRisk factors\n\nContinued.";
  expect(cutEsefSections(single).business).toBe("Only one section.\n\nRisk factors\n\nContinued.");
});

it.each([
  ["Lettre aux actionnaires", "Activités", "Facteurs de risques", "Rémunération"],
  ["Brief an die Aktionäre", "Geschäftsmodell", "Risikobericht", "Vergütungsbericht"],
  ["Carta del presidente", "Business overview", "Principal risks", "Remuneration policy"],
].map((headings) => ({ headings })))("recognizes multilingual headings and stops at the next section: $headings", ({ headings: [letter, business, risk, compensation] }) => {
  const text = `${letter}\n\nDear owners.\n\n${business}\n\nWe make tools.\n\n${risk}\n\nCompetition.\n\n${compensation}\n\nPay policy.`;
  expect(cutEsefSections(text)).toEqual({
    letter: `${letter}\n\nDear owners.`, business: `${business}\n\nWe make tools.`,
    risk: `${risk}\n\nCompetition.`, compensation: `${compensation}\n\nPay policy.`,
  });
});

it("does not treat body sentences as headings or choose table-of-contents entries", () => {
  const business = "We develop precision tools for chipmakers. ".repeat(30);
  const risk = "Our supply chain has specialized components. ".repeat(30);
  const text = `Our business\n\n5\n\nRisk factors\n\n6\n\nOur business\n\n${business}\n\nOur business depends on skilled people.\n\nRisk factors\n\n${risk}`;
  const result = cutEsefSections(text);
  expect(result.business).toBe(`Our business\n\n${business}\n\nOur business depends on skilled people.`);
  expect(result.risk).toBe(`Risk factors\n\n${risk.trim()}`);
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
});

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
  const result = cutEsefSections(htmlToText(fixture("asml-report.xhtml")));
  expect(result.compensation).toMatch(/Board of Management remuneration/);
  expect(result.compensation).toMatch(/Remuneration Policy/i);
  expect(result.compensation).not.toContain("Responsible value chain");
  expect(result.mdna ?? "").not.toMatch(/Microchips, such as NAND Flash/);
});

it("matches extended case-insensitive headings on short individual lines", () => {
  const text = "Cover\nBUSINESS MODEL AND VALUE CREATION\nWe build tools.\nRisk management and internal control\nSupply risk.\nRemuneration report for 2025\nPay policy.";
  expect(cutEsefSections(text)).toEqual({
    business: "BUSINESS MODEL AND VALUE CREATION\nWe build tools.",
    risk: "Risk management and internal control\nSupply risk.",
    compensation: "Remuneration report for 2025\nPay policy.",
  });
});

it("fills missing business even with multiple other sections and skips contents", () => {
  const text = "Cover\n\nTable of contents\n\nRisk factors\n\n5\n\nRemuneration report\n\n6\n\nRisk management and internal control\n\nActual risk prose.\n\nRemuneration report\n\nActual pay prose.";
  const sections = cutEsefSections(text);
  expect(sections.business).toBe("Actual risk prose.\n\nRemuneration report\n\nActual pay prose.");
  expect(sections.risk).toContain("Actual risk prose.");
  expect(sections.compensation).toContain("Actual pay prose.");
});

it("ignores long lines containing heading phrases", () => {
  const prose = "Business model and value creation " + "operations ".repeat(20);
  const sections = cutEsefSections(`Cover\n\n${prose}\n\nRisk factors\n\nActual risk.\n\nRemuneration policy\n\nActual pay.`);
  expect(sections.business).toBe("Actual risk.\n\nRemuneration policy\n\nActual pay.");
});

it("skips the first 2000 cover characters when no heading matches", () => {
  const cover = "C".repeat(2000);
  const body = "Unlabelled operations. ".repeat(2000);
  expect(cutEsefSections(cover + body)).toEqual({ business: body.slice(0, 32000) });
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
