import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  allEsefFilings,
  resolveItalianLei,
  cachedJson,
} from "../../../lib/value/italy/client";
import { parseMilanCsv } from "../../../lib/value/italy/companies";
let dir: string;
const fixture = (name: string) =>
  JSON.parse(readFileSync(`tests/fixtures/value/italy/${name}`, "utf8"));
beforeEach(() => {
  dir = mkdtempSync(join(homedir(), "value-italy-client-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", dir);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("resolves ENI by ISIN and caches GLEIF without guessing an ambiguous name", async () => {
  const company = parseMilanCsv(
    readFileSync("tests/fixtures/value/italy/euronext.csv", "utf8"),
  ).find((c) => c.code === "ENI")!;
  const fetch = vi.fn(async (url: string) => {
    expect(new URL(url).searchParams.get("filter[isin]")).toBe(company.isin);
    return Response.json(fixture("gleif-eni.json"));
  });
  vi.stubGlobal("fetch", fetch);
  expect(await resolveItalianLei(company)).toBe("BUCRF72VH5RBN7X3VL35");
  expect(await resolveItalianLei(company)).toBe("BUCRF72VH5RBN7X3VL35");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("follows every filing page, deduplicates filing IDs and orders restatements chronologically", async () => {
  const recorded = fixture("eni-filings.json");
  let count = 0;
  vi.stubGlobal("fetch", async () =>
    Response.json(
      ++count === 1
        ? {
            data: recorded.data.slice(0, 2),
            links: { next: "/api/filings?page[number]=2" },
          }
        : { data: recorded.data.slice(1), links: { next: null } },
    ),
  );
  const filings = await allEsefFilings("BUCRF72VH5RBN7X3VL35");
  expect(filings).toHaveLength(5);
  expect(filings.at(-1)?.attributes.period_end).toBe("2025-12-31");
  expect(count).toBe(2);
});
it("retries an interrupted body without caching a partial response", async () => {
  let count = 0;
  vi.stubGlobal("fetch", async () =>
    ++count === 1
      ? {
          ok: true,
          json: async () => {
            throw new Error("terminated");
          },
        }
      : Response.json({ ok: true }),
  );
  expect(
    await cachedJson({ key: "retry", url: "https://filings.xbrl.org/fixture" }),
  ).toEqual({ ok: true });
  expect(count).toBe(2);
});
