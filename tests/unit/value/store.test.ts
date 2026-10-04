import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCountryIndex, getDefaultIndex, getDossier, getMeta, getPrice, getTopIds, readStore } from "@/lib/value/store";

beforeEach(()=>vi.stubEnv("VALUE_DATA_READ_WRITE_TOKEN","vercel_blob_rw_teststore_secret"));

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("value store", () => {
  it("joins fixture shards and returns null for absent prices and companies", async () => {
    vi.stubEnv("VALUE_STORE_DIR", "tests/fixtures/value/store");
    expect((await getMeta())?.counts.universe).toBe(41);
    expect((await getDefaultIndex()).map((row) => row.id)).toEqual(expect.arrayContaining(["KO.US", "DAL.US"]));
    expect(await getCountryIndex("US")).toHaveLength(41);
    expect((await getDossier("KO.US"))?.company.name).toBe("Coca-Cola");
    expect(await getDossier("NOPE.US")).toBeNull();
    expect(await getPrice("SPARSE.US", "US")).toBeNull();
    expect(await getPrice("DAL.US", "US")).toEqual([50, "2026-09-28"]);
    expect(await getTopIds()).toEqual(expect.arrayContaining(["KO.US", "DAL.US"]));
  });
  it("survives missing remote data at build time", async () => {
    vi.stubEnv("VALUE_STORE_DIR", "");
    vi.stubGlobal("fetch", async () => { throw new Error("offline"); });
    expect(await getTopIds()).toEqual([]);
  });
  it("treats remote 404 as absent but rejects server errors", async () => {
    vi.stubEnv("VALUE_STORE_DIR", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({version:"a".repeat(64)})).mockResolvedValueOnce(new Response(null, {status:404})));
    expect(await readStore("meta.json")).toBeNull();
    vi.stubGlobal("fetch", async () => new Response(null, { status: 503 }));
    await expect(readStore("meta.json")).rejects.toThrow("503");
  });
  it("tags remote value reads for the authenticated publication hook", async () => {
    vi.stubEnv("VALUE_STORE_DIR", "");
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({version:'a'.repeat(64)})).mockResolvedValueOnce(new Response('{}'));
    vi.stubGlobal("fetch", fetch);
    await readStore("meta.json");
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({next:{revalidate:300,tags:['value-data']}}));
  });
  it("rejects paths outside the store", async () => {
    vi.stubEnv("VALUE_STORE_DIR", "tests/fixtures/value/store");
    await expect(readStore("../meta.json")).rejects.toThrow();
  });
});
