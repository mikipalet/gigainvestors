import { describe, expect, it } from "vitest";
import { fnv1a32, shardOf } from "@/lib/value/shard";

describe("value shards", () => {
  it("hashes deterministically into an unsigned 32-bit integer", () => {
    const hash = fnv1a32("KO.US");
    expect(fnv1a32("KO.US")).toBe(hash);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(2 ** 32);
    expect(fnv1a32("")).toBe(2166136261);
    expect(fnv1a32("hello")).toBe(1335831723);
  });

  it("formats the hash modulo 600 as three digits", () => {
    expect(shardOf("KO.US")).toMatch(/^\d{3}$/);
    expect(shardOf("KO.US")).toBe(String(fnv1a32("KO.US") % 600).padStart(3, "0"));
  });

  it("spreads 10,000 ids across at least 590 shards", () => {
    const shards = new Set(Array.from({ length: 10_000 }, (_, i) => shardOf(`TEST${i}.US`)));
    expect(shards.size).toBeGreaterThanOrEqual(590);
  });
});
