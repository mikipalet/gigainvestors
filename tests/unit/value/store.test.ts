import { afterEach, describe, expect, it, vi } from "vitest";
import { getCountryIndex, getDefaultIndex, getDossier, getMeta, getPrice, getTopIds, readStore } from "@/lib/value/store";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("value store", () => {
  it("joins fixture shards and returns null for absent prices and companies", async () => {
    vi.stubEnv("VALUE_STORE_DIR", "tests/fixtures/value/store");
    expect((await getMeta())?.counts.universe).toBe(3);
    expect((await getDefaultIndex()).map((row) => row.id)).toEqual(["KO.US", "DAL.US"]);
    expect(await getCountryIndex("US")).toHaveLength(3);
    expect((await getDossier("KO.US"))?.company.name).toBe("Coca-Cola");
    expect(await getDossier("NOPE.US")).toBeNull();
    expect(await getPrice("KO.US", "US")).toBeNull();
    expect(await getPrice("DAL.US", "US")).toEqual([50, "2026-09-28"]);
    expect(await getTopIds()).toEqual(["KO.US", "DAL.US"]);
  });
  it("survives missing remote data at build time", async () => {
    vi.stubEnv("VALUE_STORE_DIR", "");
    vi.stubGlobal("fetch", async () => { throw new Error("offline"); });
    expect(await getTopIds()).toEqual([]);
  });
  it("treats remote 404 as absent but rejects server errors", async () => {
    vi.stubEnv("VALUE_STORE_DIR", "");
    vi.stubGlobal("fetch", async () => new Response(null, { status: 404 }));
    expect(await readStore("meta.json")).toBeNull();
    vi.stubGlobal("fetch", async () => new Response(null, { status: 503 }));
    await expect(readStore("meta.json")).rejects.toThrow("503");
  });
  it("rejects paths outside the store", async () => {
    vi.stubEnv("VALUE_STORE_DIR", "tests/fixtures/value/store");
    await expect(readStore("../meta.json")).rejects.toThrow();
  });
});
