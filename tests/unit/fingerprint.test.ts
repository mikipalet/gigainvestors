import { describe, expect, it } from "vitest";
import { diffManagers, fingerprint } from "@/lib/sync/fingerprint";

describe("diffManagers", () => {
  const rows = [
    { code: "A", label: "A", portfolioValue: 10, stockCount: 2 },
    { code: "B", label: "B", portfolioValue: 20, stockCount: 3 },
  ];
  it("returns unknown and changed codes only", () => {
    expect(diffManagers(rows, {})).toEqual(["A", "B"]);
    expect(diffManagers(rows, { A: fingerprint(rows[0]), B: "20|9" })).toEqual(["B"]);
    expect(diffManagers(rows, { A: "10|2", B: "20|3" })).toEqual([]);
  });
});
