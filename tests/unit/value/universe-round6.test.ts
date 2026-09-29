import { expect, it } from "vitest";
import { collapseListings, isCommonStock, normalizedName } from "../../../lib/value/universe";

const row = (id: string, name: string, isin: string | null) => ({
  code: id.slice(0, id.lastIndexOf(".")), exchange: id.slice(id.lastIndexOf(".") + 1), name, isin,
});
it.each(["ser. A", "Series B", "Class A", "A", "B"])("normalizes Nordic class marker %s", marker => {
  expect(normalizedName(`Investor AB ${marker}`)).toBe("investor");
});
it.each(["INVE", "ATCO"])("merges %s classes with B as the no-volume fallback", code => {
  const rows = [row(`${code}-A.ST`, "Example AB ser. A", "SE0000000001"), row(`${code}-B.ST`, "Example AB ser. B", "SE0000000002")];
  for (const input of [rows, [...rows].reverse()]) {
    expect(collapseListings(input)).toEqual([{ primary: `${code}-B.ST`, listings: input.map(r => `${r.code}.${r.exchange}`) }]);
  }
});
it("selects the most liquid Nordic class when volumes are known", () => {
  const rows = [
    { ...row("ATCO-A.ST", "Atlas Copco AB Series A", "SE0017486889"), volume: 4602363.93 },
    { ...row("ATCO-B.ST", "Atlas Copco AB Series B", "SE0017486897"), volume: 1538423.24 },
  ];
  expect(collapseListings(rows)).toEqual([{ primary: "ATCO-A.ST", listings: ["ATCO-A.ST", "ATCO-B.ST"] }]);
});
it("uses code order for classes without volume outside Nordic and Brazil", () => {
  expect(collapseListings([row("ZZ.US", "Example Class A", "US0000000001"), row("AA.US", "Example Class B", "US0000000002")])[0].primary).toBe("AA.US");
});
it("prefers Brazilian ON, merges PN name markers and keeps a sole PN", () => {
  const on = row("ITUB3.SA", "Itaú Unibanco Holding S.A. ON", "BRITUBACNOR4");
  const pn = { ...row("ITUB4.SA", "Itaú Unibanco Holding S.A. PN", "BRITUBACNPR1"), volume: 1000 };
  expect(collapseListings([pn, on])).toEqual([{ primary: "ITUB3.SA", listings: ["ITUB4.SA", "ITUB3.SA"] }]);
  expect(collapseListings([pn])[0].primary).toBe("ITUB4.SA");
  expect(isCommonStock({ Type: "Preferred Stock", Name: "Itaú Unibanco PN", Code: "ITUB4", Exchange: "SA" })).toBe(true);
  expect(isCommonStock({ Type: "Preferred Stock", Name: "Example Preferred", Code: "ABC", Exchange: "US" })).toBe(false);
});
it.each(["ITUB3F", "PETR3F", "VALE3F"])("drops fractional lot %s even without an ISIN", code => {
  expect(collapseListings([row(`${code}.SA`, code, null)])).toEqual([]);
});
it.each(["BUD", "PA", "AU", "WAR", "LSE"])("drops foreign ordinary listings on %s when a home exists", exchange => {
  expect(collapseListings([row(`BAYER.${exchange}`, "Bayer AG", "DE000BAY0017"), row("BAYN.XETRA", "Bayer AG NA", "DE000BAY0017")]))
    .toEqual([{ primary: "BAYN.XETRA", listings: ["BAYN.XETRA"] }]);
});
it("drops missing-ISIN BAYER.BUD via its unique home name", () => {
  expect(collapseListings([row("BAYER.BUD", "Bayer AG", null), row("BAYN.XETRA", "Bayer AG NA", "DE000BAY0017")]))
    .toEqual([{ primary: "BAYN.XETRA", listings: ["BAYN.XETRA"] }]);
});
it("preserves foreign listings without a home on unrestricted venues and offshore operating homes", () => {
  expect(collapseListings([row("ABC.PA", "Example", "DE0000000001")])).toHaveLength(1);
  expect(collapseListings([row("0700.HK", "Tencent Holdings", "KYG875721634")])[0].primary).toBe("0700.HK");
});
it.each(["US6516391066", "AU0000297962"])("merges Newmont ASX CDI %s into the US primary", isin => {
  expect(collapseListings([row("NEM.AU", "Newmont Corporation", isin), row("NEM.US", "Newmont Goldcorp Corp", "US6516391066")]))
    .toEqual([{ primary: "NEM.US", listings: ["NEM.AU", "NEM.US"] }]);
});
it("does not merge an unrelated AU issuer into Newmont by ticker", () => {
  expect(collapseListings([row("NEM.AU", "Newmont Corporation", "AU0000000001"), row("NEM.US", "Newmont Goldcorp Corp", "US6516391066")])).toHaveLength(2);
});
it("keeps Airbus Paris ahead of the LSE European Quoting Service", () => {
  expect(collapseListings([row("0KVV.LSE", "Airbus Group SE", "NL0000235190"), row("AIR.PA", "Airbus SE", "NL0000235190"), row("AIR.MC", "Airbus SE", "NL0000235190")]))
    .toEqual([{ primary: "AIR.PA", listings: ["AIR.PA", "AIR.MC"] }]);
});
it("matches reliable ADR markers from symbol metadata", () => {
  const home = row("EX.MC", "Example SA", "ES0000000001");
  for (const metadata of [{ type: "ADR", listingExchange: "NYSE" }, { type: "Common Stock", listingExchange: "NASDAQ ADR" }]) {
    expect(collapseListings([{ ...row("EX.US", "Example", "US0000000001"), ...metadata }, home]))
      .toEqual([{ primary: "EX.MC", listings: ["EX.US", "EX.MC"] }]);
  }
  expect(collapseListings([{ ...row("EX.US", "Example", "US0000000001"), type: "Common Stock", listingExchange: "NYSE" }, home])).toHaveLength(2);
});
it("merges the ResMed ASX CDI under the US common stock", () => {
  expect(collapseListings([row("RMD.AU", "Resmed Inc", "AU000000RMD6"), row("RMD.US", "ResMed Inc", "US7611521078")]))
    .toEqual([{ primary: "RMD.US", listings: ["RMD.AU", "RMD.US"] }]);
});
it("uses valid volume when only one class has reported liquidity", () => {
  expect(collapseListings([
    { ...row("EX-A.ST", "Example A", "SE0000000001"), volume: 100 },
    row("EX-B.ST", "Example B", "SE0000000002"),
  ])[0].primary).toBe("EX-A.ST");
});
it("merges Brazilian ticker-only names after removing the class digit", () => {
  expect(collapseListings([row("ITUB4.SA", "ITUB4", "BRITUBACNPR1"), row("ITUB3.SA", "ITUB3", "BRITUBACNOR4")]))
    .toEqual([{ primary: "ITUB3.SA", listings: ["ITUB4.SA", "ITUB3.SA"] }]);
});
it.each([
  ["UMC.US", "United Microelectronics", "US9108734057", "2303.TW", "TW0002303005"],
  ["KB.US", "KB Financial Group", "US48241A1051", "105560.KO", "KR7105560007"],
  ["WDS.US", "Woodside Energy Group Ltd", "US9802283088", "WDS.AU", "AU0000224040"],
  ["SHG.US", "Shinhan Financial Group", "US8245961003", "055550.KO", "KR7055550008"],
  ["CHT.US", "Chunghwa Telecom", "US17133Q5027", "2412.TW", "TW0002412004"],
])("maps verified unlabelled %s only by its exact receipt ISIN", (us, name, isin, home, homeIsin) => {
  expect(collapseListings([row(us, name, isin), row(home, name, homeIsin)]))
    .toEqual([{ primary: home, listings: [us, home] }]);
  expect(collapseListings([row(us, name, "US0000000001"), row(home, name, homeIsin)])).toHaveLength(2);
  expect(collapseListings([row(us, name, isin)])).toEqual([{ primary: us, listings: [us] }]);
});
it("recognizes BBVA's vendor spelling variant without fuzzy name matching", () => {
  expect(collapseListings([
    row("BBVA.US", "Banco Bilbao Viscaya Argentaria SA ADR", "US05946K1016"),
    row("BBVA.MC", "Banco Bilbao Vizcaya Argentaria SA", "ES0113211835"),
  ])).toEqual([{ primary: "BBVA.MC", listings: ["BBVA.US", "BBVA.MC"] }]);
});
it.each([
  ["1878.HK", "SGQ.V", "SouthGobi Resources Ltd", "CA8443751059"],
  ["BMIN-EQO.XBOT", "BMIN.LSE", "Botswana Minerals plc", "GB00B5TFC825"],
  ["FARN.LSE", "FARON.HE", "Faron Pharmaceuticals Oy", "FI4000153309"],
  ["PTAL.LSE", "TAL.TO", "PetroTal Corp", "CA71677J1012"],
])("drops %s when its home %s omits ISIN but shares its normalized name", (foreign, home, name, isin) => {
  expect(collapseListings([row(foreign, name, isin), row(home, name, null)]))
    .toEqual([{ primary: home, listings: [home] }]);
});
it("retains Brazilian PN even when its vendor name says preferred", () => {
  expect(isCommonStock({ Type: "Preferred Stock", Name: "Example Preferred", Code: "EXAM4", Exchange: "SA" })).toBe(true);
  expect(collapseListings([row("EXAM4.SA", "Example Preferred", "BR0000000004"), row("EXAM3.SA", "Example ON", "BR0000000003")]))
    .toEqual([{ primary: "EXAM3.SA", listings: ["EXAM4.SA", "EXAM3.SA"] }]);
});
it("drops a missing-ISIN foreign venue listing in favor of a Swiss home", () => {
  expect(collapseListings([row("EX.BUD", "Example", null), row("EX.SW", "Example AG", "CH0000000001")]))
    .toEqual([{ primary: "EX.SW", listings: ["EX.SW"] }]);
});
it("preserves ON when it is an issuer name rather than a Brazilian class marker", () => {
  expect(normalizedName("ON Semiconductor Corporation")).toBe("onsemiconductor");
});
it("drops non-US receipt venues when a unique foreign home exists", () => {
  expect(collapseListings([
    row("SMSN.LSE", "Samsung Electronics", "US7960508882"),
    row("005930.KO", "Samsung Electronics", "KR7005930003"),
  ])).toEqual([{ primary: "005930.KO", listings: ["005930.KO"] }]);
});
