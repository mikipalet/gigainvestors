import { describe, expect, it } from "vitest";
import { collapseListings, normalizedName } from "../../../lib/value/universe";

const row = (id: string, name: string, isin: string | null = "US0000000001") => {
  const dot = id.lastIndexOf(".");
  return { code: id.slice(0, dot), exchange: id.slice(dot + 1), name, isin };
};

describe("venue, receipt and ADR collapse", () => {
  it.each(["CDR", "BDR", "DRN", "NVDR", "DR", "CEDEAR", "(CAD Hedged)"])("drops %s receipts", (suffix) => {
    expect(collapseListings([row("NVDA.TO", `NVIDIA ${suffix}`)])).toEqual([]);
  });
  it("drops coded Brazilian/Thai receipts and foreign Argentine listings", () => {
    const rows = [row("NVDC34.SA", "NVIDIA"), row("ASML01.BK", "ASML"), row("TOYOTA80.BK", "Toyota"), row("TSM.BA", "TSMC")];
    expect(collapseListings(rows)).toEqual([]);
    expect(collapseListings([row("PETR4.SA", "Petrobras", "BR0000000001"), row("LOCAL.BA", "Local", "AR0000000001")])).toHaveLength(2);
  });
  it.each(["Pref", "Preferred", "Pfd"])("drops %s share classes", (suffix) => {
    expect(collapseListings([row("005935.KO", `Samsung ${suffix}`, "KR0000000001")])).toEqual([]);
  });
  it("drops Korean ...5 only when a same-name ...0 exists", () => {
    expect(collapseListings([row("005935.KO", "Samsung", "KR0000000002"), row("005930.KO", "Samsung", "KR0000000001")]))
      .toEqual([{ primary: "005930.KO", listings: ["005930.KO"] }]);
    expect(collapseListings([row("123455.KQ", "Independent", "KR0000000003")])).toHaveLength(1);
  });
  it.each(["F", "STU", "MU", "HA", "DU", "HM", "BE", "XETRA", "SW", "NEO", "MX", "SN", "LIM", "BA", "BK", "VI", "LU"])("drops foreign and unknown ISIN listings on %s", (venue) => {
    expect(collapseListings([row(`XYZ.${venue}`, "Foreign"), row(`UNK.${venue}`, "Unknown", null)])).toEqual([]);
  });
  it("restricts LSE removal to IOB style codes", () => {
    expect(collapseListings([row("0ABC.LSE", "US one"), row("1234A.LSE", "US two"), row("MAIN.LSE", "US three")]))
      .toEqual([{ primary: "MAIN.LSE", listings: ["MAIN.LSE"] }]);
  });
  it("keeps only the main offshore listing on restricted venues", () => {
    expect(collapseListings([row("0Z4S.LSE", "Tencent", "KYG875721634"), row("0700.HK", "Tencent", "KYG875721634")]))
      .toEqual([{ primary: "0700.HK", listings: ["0700.HK"] }]);
    expect(collapseListings([row("MAIN.SW", "Offshore", "JE0000000001")])).toHaveLength(1);
  });
  it("prefers a domicile home venue before offshore priorities and deprioritizes secondary venues", () => {
    expect(collapseListings([row("ASML.US", "ASML", "NL0010273215"), row("ASML.AS", "ASML", "NL0010273215")])[0].primary).toBe("ASML.AS");
    expect(collapseListings([row("ABC.SW", "Offshore", "KY0000000001"), row("ABC.AU", "Offshore", "KY0000000001")])[0].primary).toBe("ABC.AU");
    expect(collapseListings([row("SHOP.US", "Shopify", "CA82509L1076"), row("SHOP.TO", "Shopify", "CA82509L1076")])[0].primary).toBe("SHOP.TO");
  });
  it.each(["Taiwan Semiconductor Manufacturing ADR", "Taiwan Semiconductor Manufacturing Sponsored ADR", "Taiwan Semiconductor Manufacturing New York Registry Shares"])("merges US receipt %s into its home listing", (name) => {
    const groups = collapseListings([row("TSM.US", name, "US8740391003"), row("2330.TW", "Taiwan Semiconductor Manufacturing Co. Ltd.", "TW0002330008")]);
    expect(groups).toEqual([{ primary: "2330.TW", listings: ["TSM.US", "2330.TW"] }]);
  });
  it("normalizes punctuated suffixes and retains standalone ADRs without inventing a home", () => {
    expect(collapseListings([row("ASML.US", "ASML Holding N.V. New York Registry Shares", "USN070592100"), row("ASML.AS", "ASML Holding N.V.", "NL0010273215")])[0].primary).toBe("ASML.AS");
    expect(collapseListings([row("TM.US", "Toyota Motor Corporation ADR", "US8923313071")])).toEqual([{ primary: "TM.US", listings: ["TM.US"] }]);
  });
});

it("attaches missing-ISIN listings and foreign US-ISIN receipts to a unique known home", () => {
  expect(collapseListings([
    row("BC94.LSE", "Samsung Electronics Co. Ltd", null),
    row("SMSN.LSE", "Samsung Electronics Co. Ltd", "US7960508882"),
    row("005930.KO", "Samsung Electronics Co Ltd", "KR7005930003"),
  ])).toEqual([{ primary: "005930.KO", listings: ["BC94.LSE", "SMSN.LSE", "005930.KO"] }]);
  expect(collapseListings([row("ITX.WAR", "Inditex", null), row("ITX.MC", "Inditex SA", "ES0148396007")])[0].primary).toBe("ITX.MC");
});

it("keeps the US ADR primary when an exact-name foreign listing has no home venue", () => {
  expect(collapseListings([row("TYT.LSE", "Toyota Motor Corp", "JP3633400001"), row("TM.US", "Toyota Motor Corporation ADR", "US8923313071")]))
    .toEqual([{ primary: "TM.US", listings: ["TYT.LSE", "TM.US"] }]);
});

it("collapses Rio Tinto's dual domicile before matching its ADR", () => {
  expect(collapseListings([
    row("RIO.AU", "Rio Tinto Ltd", "AU000000RIO1"), row("RIO.LSE", "Rio Tinto PLC", "GB0007188757"), row("RIO.US", "Rio Tinto ADR", "US7672041008"),
  ])).toEqual([{ primary: "RIO.AU", listings: ["RIO.AU", "RIO.LSE", "RIO.US"] }]);
});

it("does not attach an ADR to ambiguous homes with the same normalized name", () => {
  expect(collapseListings([row("ABC.US", "Example ADR", "US0000000001"), row("ABC.MC", "Example SA", "ES0000000001"), row("ABC.AS", "Example NV", "NL0000000001")])).toHaveLength(3);
});


it("normalizes legal suffixes and class labels without erasing the issuer", () => {
  for (const suffix of ["Ltd", "Limited", "Co", "Company", "Corp", "Corporation", "Inc", "PLC", "AG", "S.A.", "N.V.", "SE", "SpA", "ASA", "AB", "Oyj", "Holdings", "Holding", "Group", "ADR", "Sponsored", "New York Registry Shares", "Class A", "Class B", "Cl A", "Cl B"]) {
    expect(normalizedName(`Example ${suffix}`)).toBe("example");
  }
});

it("recognizes Brazil as home instead of a last-resort venue", () => {
  expect(collapseListings([row("ABC.SA", "Example", "BR0000000001"), row("ABC.AU", "Example", "BR0000000001")])[0].primary).toBe("ABC.SA");
});

it("uses offshore venue priority independently of input order", () => {
  const rows = [row("ABC.US", "Example", "KY0000000001"), row("ABC.TW", "Example", "KY0000000001"), row("ABC.HK", "Example", "KY0000000001")];
  expect(collapseListings(rows)[0].primary).toBe("ABC.HK");
  expect(collapseListings(rows.reverse())[0].primary).toBe("ABC.HK");
});

it.each(["GDR", "GDS", "Global Depositary Receipts"])("drops %s when another company listing exists", (suffix) => {
  expect(collapseListings([row("HTSC.LSE", `Huatai Securities Co. Ltd. ${suffix}`, null), row("601688.SHG", "Huatai Securities Co Ltd", "CNE100000LQ8")]))
    .toEqual([{ primary: "601688.SHG", listings: ["601688.SHG"] }]);
  expect(collapseListings([row("ONLY.LSE", `Only ${suffix}`, null)]))
    .toEqual([{ primary: "ONLY.LSE", listings: ["ONLY.LSE"] }]);
});
it.each(["American Depositary Shares", "ADS", "Depositary Shares"])("merges %s into the Korean home", (suffix) => {
  expect(collapseListings([row("SKHY.US", `SK Hynix Inc. ${suffix}`, "US78392B2060"), row("000660.KO", "SK Hynix Inc", "KR7000660001")]))
    .toEqual([{ primary: "000660.KO", listings: ["SKHY.US", "000660.KO"] }]);
});
it.each(["US", "SW"])("NEO Canadian ISIN cannot displace a %s home", (venue) => {
  const rows = [row("LLY.NEO", "Eli Lilly and Company", "CA28655A1066"), row(`LLY.${venue}`, "Eli Lilly and Company", venue === "US" ? "US5324571083" : "CH0000000001")];
  for (const input of [rows, [...rows].reverse()]) {
    const groups = collapseListings(input);
    expect(groups).toHaveLength(1);
    expect(groups[0].primary).toBe(`LLY.${venue}`);
  }
});

it("NEO defers to the home even when both a US receipt and home exist", () => {
  expect(collapseListings([
    row("EX.NEO", "Example", "CA0000000001"), row("EX.US", "Example ADS", "US0000000001"), row("EX.AS", "Example NV", "NL0000000001"),
  ])).toEqual([{ primary: "EX.AS", listings: ["EX.NEO", "EX.US", "EX.AS"] }]);
});
it.each(["American Depositary Shares", "ADS", "Depositary Shares"])("keeps standalone %s primary without a home venue", (suffix) => {
  expect(collapseListings([row("TYT.LSE", "Toyota Motor Corp", "JP3633400001"), row("TM.US", `Toyota Motor Corporation ${suffix}`, "US8923313071")]))
    .toEqual([{ primary: "TM.US", listings: ["TYT.LSE", "TM.US"] }]);
});

it("keeps Vale on its Brazilian home and drops the Argentine CEDEAR", () => {
  expect(collapseListings([
    row("XVALO.MC", "Vale SA", "BRVALEACNOR0"), row("VALE3.SA", "Vale SA", "BRVALEACNOR0"),
    row("VALE.BA", "Vale SA", "ARDEUT113925"), row("VALE.US", "Vale SA ADR", "US91912E1055"),
  ])).toEqual([{ primary: "VALE3.SA", listings: ["XVALO.MC", "VALE3.SA", "VALE.US"] }]);
  expect(collapseListings([row("VALE.BA", "Vale SA", "ARDEUT113925")])).toEqual([]);
});
it("retains standalone Latibex and genuine Argentine homes", () => {
  expect(collapseListings([row("XVALO.MC", "Vale SA", "BRVALEACNOR0")])[0].primary).toBe("XVALO.MC");
  expect(collapseListings([row("GGAL.BA", "Grupo Galicia", "ARP495251018"), row("GGAL.US", "Grupo Galicia ADR", "US3999091008")]))
    .toEqual([{ primary: "GGAL.BA", listings: ["GGAL.BA", "GGAL.US"] }]);
});
it.each(["-WT", "-WS", "-W", "-R", "-RT", "-U", "-UN", ".WS", ".W", ".U"])("drops coded OXY derivative %s before grouping", suffix => {
  expect(collapseListings([row(`OXY${suffix}.US`, "Occidental Petroleum Corporation"), row("OXY.US", "Occidental Petroleum Corporation")]))
    .toEqual([{ primary: "OXY.US", listings: ["OXY.US"] }]);
});
it("drops named warrants before grouping", () => {
  expect(collapseListings([row("OXY1.US", "Occidental Petroleum Warrants"), row("OXY.US", "Occidental Petroleum")]))
    .toEqual([{ primary: "OXY.US", listings: ["OXY.US"] }]);
});
it("keeps Domino's US ordinary stock separate from its UK namesake", () => {
  expect(collapseListings([row("DPZ.US", "Domino's Pizza Inc", "US25754A2015"), row("DOM.LSE", "Domino's Pizza Group plc", "GB00BYN59130")]))
    .toEqual([{ primary: "DPZ.US", listings: ["DPZ.US"] }, { primary: "DOM.LSE", listings: ["DOM.LSE"] }]);
});
it.each(["ABCDEY", "ABCY", "ABCDE"])("does not treat %s as a five-letter OTC receipt", code => {
  expect(collapseListings([row(`${code}.US`, "Example", "US0000000001"), row("EX.LSE", "Example", "GB0000000001")])).toHaveLength(2);
});
it.each(["ABCDY", "ABCDF"])("merges OTC receipt %s by name", code => {
  expect(collapseListings([row(`${code}.US`, "Example", "US0000000001"), row("EX.LSE", "Example", "GB0000000001")]))
    .toEqual([{ primary: "EX.LSE", listings: [`${code}.US`, "EX.LSE"] }]);
});

it.each([
  ["TSM.US", "Taiwan Semiconductor Manufacturing", "US8740391003", "2330.TW", "Taiwan Semiconductor Manufacturing Co. Ltd.", "TW0002330008"],
  ["BHP.US", "BHP Group Limited", "US0886061086", "BHP.AU", "BHP Group Ltd", "AU000000BHP4"],
  ["NVO.US", "Novo Nordisk A/S", "US6701002056", "NOVO-B.CO", "Novo Nordisk A/S", "DK0062498333"],
])("maps verified unlabelled receipt %s by exact ISIN, never name alone", (us, name, isin, home, homeName, homeIsin) => {
  expect(collapseListings([row(us, name, isin), row(home, homeName, homeIsin)]))
    .toEqual([{ primary: home, listings: [us, home] }]);
  expect(collapseListings([row(us, name, "US0000000001"), row(home, homeName, homeIsin)])).toHaveLength(2);
  expect(collapseListings([row(us, name, isin)])[0]).toEqual({ primary: us, listings: [us] });
});

it("does not route a US ordinary stock into a namesake home via a foreign cross-listing", () => {
  const groups = collapseListings([
    row("DPZ.US", "Domino's Pizza Inc", "US25754A2015"),
    row("DPZ.MC", "Domino's Pizza Inc", "US25754A2015"),
    row("DOM.LSE", "Domino's Pizza Group plc", "GB00BYN59130"),
  ]);
  expect(groups).toEqual([
    { primary: "DPZ.US", listings: ["DPZ.US", "DPZ.MC"] },
    { primary: "DOM.LSE", listings: ["DOM.LSE"] },
  ]);
});
