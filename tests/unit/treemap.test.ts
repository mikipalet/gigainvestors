import { describe, expect, it } from "vitest";
import { layout } from "@/lib/treemap/layout";
import { tierFor } from "@/lib/treemap/tier";
import { formatDelta, formatMoney } from "@/lib/format";

describe("layout", () => {
  it("fills the box and drops non-positive values", () => {
    const r = layout([{ id: "a", value: 3 }, { id: "b", value: 1 }, { id: "c", value: 0 }], 400, 200, 0);
    expect(r.map((x) => x.id).sort()).toEqual(["a", "b"]);
    expect(r.reduce((s, x) => s + x.w * x.h, 0)).toBeCloseTo(80000, 0);
    expect(r.find((x) => x.id === "a")!.w * r.find((x) => x.id === "a")!.h).toBeCloseTo(60000, 0);
  });
  it("returns empty on empty input", () => {
    expect(layout([], 100, 100)).toEqual([]);
  });
});

describe("tierFor", () => {
  it("steps by area", () => {
    expect(tierFor(250, 200)).toBe("full");
    expect(tierFor(120, 120)).toBe("name");
    expect(tierFor(60, 60)).toBe("face");
    expect(tierFor(40, 40)).toBe("blank");
  });
});

describe("format", () => {
  it("money and delta", () => {
    expect(formatMoney(2.99e11)).toBe("$299B");
    expect(formatMoney(4.24e9)).toBe("$4.2B");
    expect(formatMoney(1.92e8)).toBe("$192M");
    expect(formatDelta(110, 100)).toBe("+10%");
    expect(formatDelta(95, 100)).toBe("−5.0%");
    expect(formatDelta(1, undefined)).toBeNull();
  });
});
