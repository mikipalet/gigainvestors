import { describe, expect, it } from "vitest";
import { checkUniverse } from "../../../scripts/value/check-universe";
import type { Company } from "../../../lib/value/types";

const company = (id: string, name: string, country: string, listings = [id]): Company => ({
  id, name, country, listings, code: id.split(".")[0], exchange: id.split(".")[1], currency: "USD", isin: null,
  cik: null, lei: null, edinetCode: null, sector: null, industry: null, kind: "operating", marketCapUsd: 100,
  description: null, source: "eodhd",
});
const valid = () => [
  company("VALE3.SA", "Vale SA", "BR", ["VALE3.SA", "VALE.US", "XVALO.MC"]),
  company("OXY.US", "Occidental Petroleum", "US"), company("DPZ.US", "Domino US", "US"), company("DOM.LSE", "Domino UK", "GB"),
  company("LLY.US", "Eli Lilly and Company", "US"), company("000660.KO", "SK Hynix Inc", "KR", ["000660.KO", "SKHY.US"]),
  company("NVDA.US", "Nvidia", "US"), company("AAPL.US", "Apple", "US"),
  company("2330.TW", "TSMC", "TW", ["TSM.US", "2330.TW"]), company("0700.HK", "Tencent", "HK"),
  company("ASML.AS", "ASML", "NL"), company("NESN.SW", "Nestle", "CH"), company("SHOP.TO", "Shopify", "CA"),
  company("005930.KO", "Samsung", "KR"), company("HSBA.LSE", "HSBC", "GB"), company("TM.US", "Toyota ADR", "US"),
  ...Array.from({ length: 2000 }, (_, i) => company(`TEST${i}.HK`, `Company ${i}`, "HK")),
];

describe("universe acceptance checks", () => {
  it("passes the expected primaries, merged TSM, HK coverage and unique names", () => {
    const rows = [...valid(), company("7203.KLSE", "Wang-Zheng Bhd", "MY")];
    expect(checkUniverse(rows).every((check) => check.ok)).toBe(true);
  });
  it("detects duplicate normalized names in market-cap order even when input is unsorted", () => {
    const rows = valid();
    rows.push({ ...company("OTHER.US", "Nvidia Corporation", "US"), marketCapUsd: 1000 });
    expect(checkUniverse(rows).find((check) => check.label.startsWith("Top 300"))?.ok).toBe(false);
  });
  it("fails missing merges, wrong countries, preferreds, invented Toyota and missing HK", () => {
    const rows = valid().filter((row) => row.country !== "HK");
    rows.find((row) => row.id === "2330.TW")!.listings = ["2330.TW"];
    rows.find((row) => row.id === "ASML.AS")!.country = "US";
    rows.push(company("005935.KO", "Samsung Pref", "KR"), company("7203.JP", "Toyota", "JP"));
    const failures = checkUniverse(rows).filter((check) => !check.ok).map((check) => check.label);
    expect(failures).toEqual(expect.arrayContaining(["ASML.AS primary / NL", "0700.HK primary / HK", "TSM.US merged under 2330.TW", "Samsung preferred excluded", "Toyota TM.US ADR; 7203 absent", "HK company count >= 2000"]));
  });
});

it("rejects GDR top primaries, standalone SKHY and a NEO Lilly primary", () => {
  const rows = valid().filter((row) => row.id !== "LLY.US");
  rows.push(company("LLY.NEO", "Eli Lilly and Company", "CA"), company("SKHY.US", "SK Hynix ADS", "US"),
    { ...company("HTSC.LSE", "Huatai Securities GDR", "GB"), marketCapUsd: 10000 });
  const failed = checkUniverse(rows).filter((check) => !check.ok).map((check) => check.label);
  expect(failed).toEqual(expect.arrayContaining(["No GDR primaries in top 300", "SKHY.US merged under 000660.KO", "LLY.US primary / US"]));
});

it("rejects the round-five primary regressions and a merged Domino company", () => {
  const rows = valid().filter(row => !["VALE3.SA", "OXY.US", "DPZ.US"].includes(row.id));
  rows.find(row => row.id === "DOM.LSE")!.listings.push("DPZ.US");
  const failed = checkUniverse(rows).filter(check => !check.ok).map(check => check.label);
  expect(failed).toEqual(expect.arrayContaining(["VALE3.SA primary / BR", "OXY.US primary / US", "DPZ.US primary / US", "DPZ.US separate from DOM.LSE"]));
});
it.each(["BA", "SW", "MU", "F", "NEO", "MX"])("rejects %s primary when its issuer has a home listing", venue => {
  const rows = valid();
  rows.push({ ...company(`BAD.${venue}`, "Bad primary", "US", [`BAD.${venue}`, "BAD.US"]), isin: "US0000000001" });
  expect(checkUniverse(rows).find(check => check.label === "No secondary primaries when a home listing exists")?.ok).toBe(false);
});
it("permits a Swiss home primary", () => {
  const rows = valid();
  Object.assign(rows.find(row => row.id === "NESN.SW")!, { isin: "CH0038863350", listings: ["NESN.SW", "NESN.US"] });
  expect(checkUniverse(rows).every(check => check.ok)).toBe(true);
});

it.each(["F", "MU"])("rejects a German %s primary when XETRA exists", venue => {
  const rows = valid();
  rows.push({ ...company(`BAD.${venue}`, "Bad German primary", "DE", [`BAD.${venue}`, "BAD.XETRA"]), isin: "DE0000000001" });
  expect(checkUniverse(rows).find(check => check.label === "No secondary primaries when a home listing exists")?.ok).toBe(false);
});
