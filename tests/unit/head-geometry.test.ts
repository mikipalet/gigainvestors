import { describe, expect, it } from "vitest";
import { headGeometry } from "@/lib/head-geometry";

function drawing(w: number, h: number, paint: (x: number, y: number) => boolean) {
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) alpha[y * w + x] = paint(x, y) ? 255 : 0;
  return { alpha, w, h };
}

describe("headGeometry", () => {
  it("finds a circle head drawn above square shoulders", () => {
    const g = headGeometry(drawing(100, 140, (x, y) => Math.hypot(x - 50, y - 40) < 30 || (y > 90 && x > 5 && x < 95)));
    expect(g.cx).toBeCloseTo(0.5, 1);
    expect(g.rx).toBeCloseTo(0.3, 1);
    expect(g.ry).toBeCloseTo((30 * 1.3) / 140, 1);
    expect(g.cy * 140).toBeCloseTo(10 + 30 * 1.3, -1);
  });
  it("follows a head drawn off centre", () => {
    const g = headGeometry(drawing(100, 140, (x, y) => Math.hypot(x - 30, y - 40) < 25));
    expect(g.cx).toBeCloseTo(0.3, 1);
  });
  it("caps very wide hair at a plausible skull width", () => {
    const g = headGeometry(drawing(100, 140, (x, y) => y > 10 && y < 60));
    expect(g.rx).toBeLessThanOrEqual(0.36);
  });
  it("falls back to a centred head for a blank image", () => {
    expect(headGeometry(drawing(10, 10, () => false))).toEqual({ cx: 0.5, cy: 0.33, rx: 0.3, ry: 0.39 });
  });
});
