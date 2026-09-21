import { describe, expect, it } from "vitest";
import { buildHead, surface } from "@/lib/heads/model";
import { hashSeed, sketchHair, traitsFor } from "@/lib/heads/traits";

describe("traitsFor", () => {
  it("is deterministic per seed and differs between seeds", () => {
    expect(traitsFor(hashSeed("warren-buffett"))).toEqual(traitsFor(hashSeed("warren-buffett")));
    expect(traitsFor(hashSeed("warren-buffett"))).not.toEqual(traitsFor(hashSeed("bill-ackman")));
  });
  it("reads the hair style off the sketch", () => {
    expect(traitsFor(1, { crown: 0.6, sides: 0 }).hair.style).toBe("solid");
    expect(traitsFor(1, { crown: 0.2, sides: 0 }).hair.style).toBe("hatch");
    expect(traitsFor(1, { crown: 0.02, sides: 0 }).hair.style).toBe("bald");
    expect(traitsFor(1, { crown: 0.2, sides: 0.4 }).hair.style).toBe("long");
  });
});

describe("sketchHair", () => {
  it("sees ink on the crown and none down the sides of a bare head", () => {
    const w = 100, h = 120;
    const alpha = new Uint8Array(w * h);
    for (let y = 5; y < 30; y++) for (let x = 25; x < 75; x++) alpha[y * w + x] = 255;
    const hair = sketchHair({ alpha, w, h, head: { cx: 0.5, cy: 0.35, rx: 0.3, ry: 0.36 } });
    expect(hair.crown).toBeGreaterThan(0.5);
    expect(hair.sides).toBe(0);
  });
});

describe("buildHead", () => {
  const t = traitsFor(hashSeed("test"), { crown: 0.5, sides: 0 });
  it("builds a closed mesh: every edge is shared by exactly two faces", () => {
    const { mesh } = buildHead(t, "coarse");
    const seen = new Map<string, number>();
    for (const [a, b, c] of mesh.faces) {
      for (const [x, y] of [[a, b], [b, c], [c, a]]) {
        if (x === y) continue;
        const k = x < y ? `${x}-${y}` : `${y}-${x}`;
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
    }
    expect([...seen.values()].every((n) => n === 2)).toBe(true);
    expect(mesh.edges.length).toBe(seen.size);
  });
  it("winds every face outward", () => {
    const { mesh } = buildHead(t, "mid");
    for (const [a, b, c] of mesh.faces) {
      const A = mesh.verts[a], B = mesh.verts[b], C = mesh.verts[c];
      const n = [(B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]), (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]), (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])];
      const m = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3];
      expect(n[0] * m[0] + n[1] * m[1] + n[2] * m[2]).toBeGreaterThanOrEqual(0);
    }
  });
  it("puts hair on the crown and none on the chin, and the nose in front of the face", () => {
    const { mesh, strokes } = buildHead(t, "fine");
    const crown = mesh.faces.findIndex(([a]) => mesh.verts[a][1] > t.ry * 0.9);
    const chin = mesh.faces.findIndex(([a]) => mesh.verts[a][1] < -t.ry * 0.9);
    expect(mesh.hair[crown]).toBe(1);
    expect(mesh.hair[chin]).toBe(0);
    const tip = strokes[2].pts[2];
    expect(tip[2]).toBeGreaterThan(surface(t).point(0, -0.08)[2]);
  });
  it("has the face at the front and the ears at the sides", () => {
    const S = surface(t);
    expect(S.normal(0, 0)[2]).toBeGreaterThan(0.9);
    expect(Math.abs(S.normal(Math.PI / 2, 0)[0])).toBeGreaterThan(0.9);
  });
});
