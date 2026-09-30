import { describe, expect, it } from "vitest";
import { buildSearchShards, searchShard, searchShardKey, searchTokens } from "@/lib/value/search";
import type { Company } from "@/lib/value/types";

const company = (id: string, name: string, cap: number | null, listings = [id]): Company => ({
  id, name, code: id.slice(0, id.lastIndexOf('.')), exchange: id.split('.').at(-1)!,
  country: "US", currency: "USD", isin: null, cik: null, lei: null, edinetCode: null,
  sector: null, industry: null, kind: "operating", listings, marketCapUsd: cap,
  description: null, source: "eodhd",
});
const companies = [
  company("2330.TW", "Taiwan Semiconductor Manufacturing Co. Ltd.", 2014077826328, ["TSM.US", "2330.TW"]),
  company("KO.US", "The Coca-Cola Company", 375096213504),
  company("COKE.US", "Coca-Cola Consolidated Inc", 10000000000),
  company("NESTLE.KAR", "Nestle Pakistan Ltd", null),
  company("NESN.SW", "Nestlé S.A.", 237316610064),
  company("0700.HK", "Tencent Holdings Ltd", null, ["0700.HK", "700.HK"]),
  company("ASML.AS", "ASML Holding N.V.", 671288507852, ["ASML.AS", "ASML.US"]),
  company("ASMLX.US", "ASML Other", 1),
];

describe("value search shards", () => {
  it.each([["tsm", "2330.TW"], ["coca", "KO.US"], ["nestle", "NESN.SW"], ["0700", "0700.HK"], ["asml", "ASML.AS"]])("%s finds %s first", (query, id) => {
    const shards = buildSearchShards(companies, new Set(["KO.US"]));
    expect(searchShard(shards[query.slice(0, 2)], query)[0][0]).toBe(id);
  });
  it("indexes every listing and ISIN, strips accents and corporate stop words", () => {
    const c = { ...companies[4], isin: "CH0038863350" };
    expect(searchTokens(c)).toEqual(expect.arrayContaining(["nestle", "nesn", "ch0038863350"]));
    expect(searchTokens(c)).not.toEqual(expect.arrayContaining(["sa"]));
    expect(searchTokens(company("X.US", "Élan Inc Ltd PLC SA AG Corp Holdings", null))).toEqual(["elan", "x"]);
    const shards = buildSearchShards([c], new Set());
    expect(searchShard(shards.ch, "CH0038863350")[0][0]).toBe("NESN.SW");
    expect(searchShard(shards.ne, "NESTLÉ")[0][0]).toBe("NESN.SW");
  });
  it.each([[" NÉSTLÉ ", "ne"], ["F", "f_"], ["0700", "07"], ["C&G", "c&"], ["Q-CON", "q-"], [" ", ""]])("maps query %s to shard %s", (query, key) => {
    expect(searchShardKey(query)).toBe(key);
  });
  it("preserves punctuation in listing prefixes and their alias postings", () => {
    const shards = buildSearchShards([company("C&G.BK", "Example", null)], new Set());
    expect(searchShard(shards["c&"], "c&g")[0][0]).toBe("C&G.BK");
  });
  it("puts all matching companies in single-character heads", () => {
    const shards = buildSearchShards([company("F.US", "Ford Motor", null), company("FO.US", "Forest", null)], new Set());
    expect(searchShard(shards.f_, "f").map(row => row[0])).toEqual(["F.US", "FO.US"]);
    expect(shards.fo.rows.map(row => row[0])).toEqual(["F.US", "FO.US"]);
    expect(shards.f).toBeUndefined();
  });
  it("includes pending companies, rounds caps and deduplicates rows per shard", () => {
    const shards = buildSearchShards(companies, new Set(["KO.US"]));
    expect(shards.co.rows.find(row => row[0] === "KO.US")).toEqual(["KO.US", "The Coca-Cola Company", "US", "a", 380000000000, "KO.US"]);
    expect(shards.te.rows.find(row => row[0] === "0700.HK")?.slice(3)).toEqual(["p", null, null]);
    expect(shards.as.rows.filter(row => row[0] === "ASML.AS")).toHaveLength(1);
    expect(Object.keys(shards)).toHaveLength(36 * 40);
    expect(buildSearchShards([...companies].reverse(), new Set(["KO.US"]))).toEqual(shards);
  });
});

describe('adaptive shards', () => {
  it('splits recursively, keeps bounded market-cap heads and remaps aliases', async () => {
    const { buildAdaptiveSearchShards } = await import('@/lib/value/search');
    const { shardKeyFor } = await import('@/lib/value/search-shard');
    const rows = Array.from({ length: 1600 }, (_, i) => company(`XY${String(i).padStart(4, '0')}.US`, `Écho international ${i}`, i));
    const { shards, manifest } = buildAdaptiveSearchShards(rows, new Set());
    expect(manifest.split).toEqual(expect.arrayContaining(['xy', 'xy0']));
    expect(manifest.maxPrefix).toBeGreaterThanOrEqual(4);
    expect(shards.xy.rows).toHaveLength(300);
    expect(shards.xy.rows[0][0]).toBe('XY1599.US');
    expect(shards.xy.rows.at(-1)?.[0]).toBe('XY1300.US');
    expect(shards.e_.rows[0][0]).toBe('XY1599.US');
    expect(shards.echo.rows).toHaveLength(300);
    expect(shards.echo.rows[0][0]).toBe('XY1599.US');
    expect(manifest.maxPrefix).toBeLessThan(20);
    for (const shard of Object.values(shards)) expect(Buffer.byteLength(JSON.stringify(shard) + '\n')).toBeLessThanOrEqual(60000);
    for (const i of [0, 799, 1599]) {
      const query = `xy${String(i).padStart(4, '0')}`;
      expect(searchShard(shards[shardKeyFor(query, manifest)], query)[0][0]).toBe(`${query.toUpperCase()}.US`);
    }
    expect(shards[shardKeyFor('xy9', manifest)].rows).toEqual([]);
    expect(buildAdaptiveSearchShards([...rows].reverse(), new Set())).toEqual({ shards, manifest });
  });
});

it('refuses a head that cannot satisfy both top-300 and the raw byte budget', async () => {
  const { buildAdaptiveSearchShards } = await import('@/lib/value/search');
  const rows = Array.from({ length: 301 }, (_, i) => company(`XY${i}.US`, 'É'.repeat(200), i));
  expect(() => buildAdaptiveSearchShards(rows, new Set())).toThrow(/head .* exceeds 60000 bytes/);
});
