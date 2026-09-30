import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { yearsFromEsef, mergeEsefYears } from "../../../lib/value/italy/facts";
import {
  parseMilanCsv,
  mergeItalianCompanies,
} from "../../../lib/value/italy/companies";
import {
  compareDownloads,
  capFromQuote,
  parseYahooShares,
} from "../../../lib/value/download-order";
import type { Company } from "../../../lib/value/types";
const fixture = (name: string) =>
  readFileSync(`tests/fixtures/value/italy/${name}`, "utf8");
const eni = JSON.parse(fixture("eni-2025.json"));
it("reads ENI consolidated annual current and comparative facts in absolute EUR units", () => {
  const years = yearsFromEsef({ raw: eni, lei: "BUCRF72VH5RBN7X3VL35" });
  expect(years.map((y) => y.fy)).toEqual([2023, 2024, 2025]);
  expect(years.at(-1)).toMatchObject({
    end: "2025-12-31",
    revenue: 82151000000,
    ocf: 13330000000,
    capex: 9229000000,
    equity: 47940000000,
    totalDebt: 28502000000,
  });
  expect(years.at(-2)?.revenue).toBe(88797000000);
});
it("ignores segment, wrong entity and quarterly facts; missing remains null", () => {
  const raw = structuredClone(eni);
  raw.facts.fake = {
    value: "999",
    dimensions: {
      concept: "ifrs-full:Revenue",
      entity: "scheme:OTHER",
      period: "2025-01-01T00:00:00/2026-01-01T00:00:00",
      unit: "iso4217:EUR",
    },
  };
  raw.facts.quarter = {
    value: "999",
    dimensions: {
      concept: "ifrs-full:Revenue",
      entity: "scheme:BUCRF72VH5RBN7X3VL35",
      period: "2025-10-01T00:00:00/2026-01-01T00:00:00",
      unit: "iso4217:EUR",
    },
  };
  expect(
    yearsFromEsef({ raw, lei: "BUCRF72VH5RBN7X3VL35" }).at(-1)?.revenue,
  ).toBe(82151000000);
});
it("keeps older balance facts when a newer comparative supplies only income", () => {
  const years = yearsFromEsef({ raw: eni, lei: "BUCRF72VH5RBN7X3VL35" });
  const old = { ...years[0], cash: 123 };
  expect(mergeEsefYears([old], [years[0]])[0].cash).toBe(123);
});
it("parses the official Milan and Growth export and merges Ferrari into its home listing", () => {
  const companies = parseMilanCsv(fixture("euronext.csv"));
  expect(companies.length).toBe(403);
  expect(
    companies.some(
      (c) =>
        c.code === "WABC29" ||
        c.code === "WDHH28" ||
        c.code === "WDIT27" ||
        c.code === "WBDR" ||
        c.code === "KMER",
    ),
  ).toBe(false);
  expect(companies.some((c) => c.code === "EDNR")).toBe(true);
  const race = companies.find((c) => c.code === "RACE")!;
  expect(race).toMatchObject({ id: "RACE.MI", country: "IT", source: "esef" });
  const us = {
    ...race,
    id: "RACE.US",
    exchange: "US",
    country: "US",
    source: "eodhd",
    listings: ["RACE.US"],
    marketCapUsd: 100,
  } as Company;
  const merged = mergeItalianCompanies({ existing: [us], incoming: [race] });
  expect(merged.companies).toHaveLength(1);
  expect(merged.companies[0]).toMatchObject({
    id: "RACE.MI",
    listings: ["RACE.MI", "RACE.US"],
    marketCapUsd: 100,
  });
});
it("orders Western venues (including ADRs) before foreign homes, then cap and unknown venue importance", () => {
  const base = parseMilanCsv(fixture("euronext.csv"))[0];
  const c = (id: string, cap: number | null, venue?: string) => ({
    ...base,
    id,
    exchange: id.split(".").at(-1)!,
    listings: [id],
    marketCapUsd: cap,
    listingExchange: venue,
  });
  const rows = [
    c("OTC.US", null, "PINK"),
    c("BIG.SHG", 1e12),
    c("ENI.MI", 1e10),
    c("MAIN.US", null, "NYSE"),
    c("ADR.US", 1e11, "NYSE"),
  ];
  expect(rows.sort(compareDownloads).map((c) => c.id)).toEqual([
    "ADR.US",
    "ENI.MI",
    "MAIN.US",
    "OTC.US",
    "BIG.SHG",
  ]);
  expect(
    capFromQuote({ price: 100, shares: 20, currency: "GBp", usdRate: 1.3 }),
  ).toBe(26);
  expect(
    capFromQuote({ price: 100, shares: null, currency: "USD", usdRate: 1 }),
  ).toBeNull();
});
it("uses the newest reported ordinary share count from the recorded Yahoo time series", () => {
  const raw = JSON.parse(fixture("yahoo-aapl-shares.json"));
  expect(parseYahooShares(raw)).toBe(14687356000);
  expect(parseYahooShares({ timeseries: { result: [] } })).toBeNull();
});
it("rejects conflicting duplicate facts and accepts zero without inventing missing capex", () => {
  const raw = structuredClone(eni);
  const revenue = Object.values(raw.facts).find(
    (f: any) =>
      f.dimensions.concept === "ifrs-full:RevenueFromContractsWithCustomers" &&
      f.dimensions.period.startsWith("2025-") &&
      Object.keys(f.dimensions).length === 4,
  ) as any;
  raw.facts.conflict = { ...revenue, value: "1" };
  const y = yearsFromEsef({ raw, lei: "BUCRF72VH5RBN7X3VL35" }).at(-1)!;
  expect(y.revenue).toBeNull();
});
it("requires annual duration and shares units and supports non-calendar fiscal periods", () => {
  const fact = (
    concept: string,
    value: string,
    period: string,
    unit = "iso4217:EUR",
  ) => ({
    value,
    dimensions: {
      concept: `ifrs-full:${concept}`,
      value,
      period,
      unit,
      entity: "lei:TEST",
    },
  });
  const raw = {
    documentInfo: {
      namespaces: {
        "ifrs-full": "https://xbrl.ifrs.org/taxonomy/2024-03-27/ifrs-full",
      },
    },
    facts: {
      income: fact(
        "ProfitLoss",
        "100",
        "2024-04-01T00:00:00/2025-04-01T00:00:00",
      ),
      shares: fact(
        "WeightedAverageNumberOfSharesOutstanding",
        "20",
        "2024-04-01T00:00:00/2025-04-01T00:00:00",
        "xbrli:shares",
      ),
      cash: fact("CashAndCashEquivalents", "0", "2025-04-01T00:00:00"),
      ppe: fact(
        "PurchaseOfPropertyPlantAndEquipment",
        "10",
        "2024-04-01T00:00:00/2025-04-01T00:00:00",
      ),
    },
  };
  // The custom property above is not an XBRL dimension.
  for (const f of Object.values(raw.facts)) delete (f.dimensions as any).value;
  expect(yearsFromEsef({ raw, lei: "TEST" })[0]).toMatchObject({
    fy: 2025,
    end: "2025-03-31",
    netIncome: 100,
    dilutedShares: 20,
    cash: 0,
    capex: null,
  });
  raw.facts.shares.dimensions.unit = "iso4217:EUR";
  expect(yearsFromEsef({ raw, lei: "TEST" })[0].dilutedShares).toBeNull();
});
it.each([
  ["race.mi-latest.json", "549300RIVY5EX8RCON76", 2025, 7145768000, 1596919000],
  [
    "enel.mi-latest.json",
    "WOCMU6HCI0OJWNPRZS33",
    2024,
    73914000000,
    7016000000,
  ],
  ["monc.mi-latest.json", "815600EBD7FB00525B20", 2025, 3132128000, 626670000],
  ["isp.mi-2022.json", "2W8N8UU78PMDQKZENC08", 2022, null, 4354000000],
])(
  "checks recorded %s against the annual financial statements",
  (file, lei, fy, revenue, netIncome) => {
    const y = yearsFromEsef({
      raw: JSON.parse(fixture(String(file))),
      lei: String(lei),
    }).find((y) => y.fy === fy);
    expect(y).toMatchObject({ fy, revenue, netIncome });
  },
);
it("does not merge an unrelated ordinary US namesake without identity or ADR evidence", () => {
  const home = parseMilanCsv(fixture("euronext.csv")).find(
    (c) => c.code === "ENI",
  )!;
  const us = {
    ...home,
    id: "OTHER.US",
    code: "OTHER",
    exchange: "US",
    country: "US",
    isin: "US0000000001",
    listings: ["OTHER.US"],
    source: "eodhd",
  } as Company;
  expect(
    mergeItalianCompanies({ existing: [us], incoming: [home] }).companies,
  ).toHaveLength(2);
  const adr = { ...us, name: "ENI ADR" };
  expect(
    mergeItalianCompanies({ existing: [adr], incoming: [home] }).companies,
  ).toHaveLength(1);
});
it("keeps Japanese and foreign acronym namesakes separate from Milan issuers", () => {
  const rows = parseMilanCsv(fixture("euronext.csv"));
  const cases = [
    ["ABC", "8783.JP", "JP", "ABC Company"],
    ["ADV", "6030.JP", "JP", "Adventure Inc"],
    ["ARIS", "ARIS.XZIM", "ZW", "ARISTON HOLDINGS LIMITED"],
    ["ETS", "8031.HK", "HK", "ETS Group Ltd"],
    ["FILA", "081660.KO", "KR", "Fila Holdings Corp"],
    ["FIC", "FCAP.US", "US", "First Capital Inc"],
  ];
  for (const [code, id, country, name] of cases) {
    const home = rows.find((c) => c.code === code)!;
    const foreign = {
      ...home,
      id,
      code: id.split(".")[0],
      exchange: id.split(".")[1],
      country,
      name,
      isin: null,
      lei: null,
      listings: [id],
      source: "eodhd",
    } as Company;
    expect(
      mergeItalianCompanies({
        existing: [foreign],
        incoming: [home],
      }).companies.map((c) => c.id),
    ).toContain(id);
  }
});
