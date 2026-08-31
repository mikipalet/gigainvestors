import { describe, expect, it } from "vitest";
import { formatChange, formatMoney, formatPct, plural } from "@/lib/format";

describe("formatPct", () => {
  it("never reports a real position as zero", () => {
    expect(formatPct(0.012)).toBe("<0.1%");
    expect(formatPct(0.049)).toBe("<0.1%");
    expect(formatPct(0)).toBe("0.0%");
    expect(formatPct(0.06)).toBe("0.1%");
    expect(formatPct(4.25)).toBe("4.3%");
    expect(formatPct(12.6)).toBe("13%");
  });
});

describe("plural", () => {
  it("counts one thing correctly", () => {
    expect(plural(1, "holder")).toBe("1 holder");
    expect(plural(0, "holder")).toBe("0 holders");
    expect(plural(22, "investor")).toBe("22 investors");
  });
});

describe("formatMoney and formatChange", () => {
  it("keeps the scale readable", () => {
    expect(formatMoney(17_155_532_464)).toBe("$17B");
    expect(formatMoney(786_000_000)).toBe("$786M");
    expect(formatChange(630555)).toBe("×6,307");
    expect(formatChange(null)).toBeNull();
  });
});
