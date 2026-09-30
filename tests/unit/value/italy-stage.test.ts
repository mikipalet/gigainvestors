import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { readCorpusJson, readJsonl } from "../../../lib/value/corpus";
import {
  allEsefFilings,
  filingFacts,
  italyText,
  resolveItalianLei,
} from "../../../lib/value/italy/client";
import italy from "../../../scripts/value/stages/italy";
vi.mock("../../../lib/value/italy/client", () => ({
  allEsefFilings: vi.fn(),
  filingFacts: vi.fn(),
  italyText: vi.fn(),
  resolveItalianLei: vi.fn(),
}));
vi.mock("../../../lib/value/fx", () => ({
  createUsdRate: () => async () => 1.1,
}));
let dir: string;
const text = (name: string) =>
  readFileSync(`tests/fixtures/value/italy/${name}`, "utf8");
beforeEach(() => {
  dir = mkdtempSync(join(homedir(), "value-italy-stage-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", dir);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.stubGlobal("fetch", async (url: string) => {
    expect(url).toContain("/chart/ENI.MI?range=10y&interval=1mo");
    return Response.json(JSON.parse(text("yahoo-eni.json")));
  });
  vi.mocked(resolveItalianLei).mockResolvedValue("BUCRF72VH5RBN7X3VL35");
  vi.mocked(allEsefFilings).mockResolvedValue([
    JSON.parse(text("eni-filings.json")).data.at(-1),
  ]);
  vi.mocked(filingFacts).mockResolvedValue(JSON.parse(text("eni-2025.json")));
  vi.mocked(italyText).mockImplementation(async (url: string) =>
    url.includes("/download?")
      ? text("euronext.csv")
      : "<html><body>Report</body></html>",
  );
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
it("runs corpus-only fundamentals, report and Yahoo prices, and resumes cached filing work", async () => {
  await italy({ only: ["ENI.MI"] });
  expect(readJsonl("universe.jsonl")).toMatchObject([
    { id: "ENI.MI", source: "esef", lei: "BUCRF72VH5RBN7X3VL35" },
  ]);
  expect(readCorpusJson("fundamentals/ENI.MI.json")).toMatchObject({
    currency: "EUR",
    integrity: { ok: false, reasons: ["fewer than 7 annual periods"] },
  });
  expect(readCorpusJson("reports/ENI.MI/meta.json")).toMatchObject({
    kind: "ESEF",
    period: "2025-12-31",
  });
  expect(readCorpusJson("prices/IT.json")).toMatchObject({
    "ENI.MI": [23.955, "2026-09-30"],
  });
  expect(
    readCorpusJson<any[]>("prices-history/ENI.MI.json")!.length,
  ).toBeGreaterThan(100);
  await italy({ only: ["ENI.MI"] });
  expect(filingFacts).toHaveBeenCalledTimes(1);
});
it("retains a listed company and its prices when no ESEF filing is available", async () => {
  vi.mocked(allEsefFilings).mockResolvedValue([]);
  await italy({ only: ["ENI.MI"] });
  expect(readJsonl("universe.jsonl")).toHaveLength(1);
  expect(readCorpusJson("fundamentals/ENI.MI.json")).toBeNull();
  expect(readCorpusJson("raw/esef/summary.json")).toMatchObject({
    companies: 1,
    withFundamentals: 0,
    gaps: [{ id: "ENI.MI", reason: "No ESEF filing available" }],
  });
  expect(readCorpusJson("prices/IT.json")).toBeTruthy();
});

it.each(["bf", "illa"])(
  "preserves recorded %s history with no usable current quote",
  async (symbol) => {
    vi.stubGlobal("fetch", async () =>
      Response.json(JSON.parse(text(`yahoo-${symbol}.json`))),
    );
    await italy({ only: ["ENI.MI"] });
    expect(
      readCorpusJson<any[]>("prices-history/ENI.MI.json")!.length,
    ).toBeGreaterThan(10);
    expect(readCorpusJson("prices/IT.json")).toEqual({});
    expect(readCorpusJson("raw/esef/summary.json")).toMatchObject({
      errors: [],
      gaps: [
        {
          id: "ENI.MI",
          reason: "Yahoo has history but no usable current quote",
        },
      ],
    });
  },
);
