import { describe, expect, it } from "vitest";
import { aimAt, flyAt, GESTURE_MS, gesturePose, MAX_PITCH, MAX_YAW, resolveHeadCases, REST, SNEEZE_AT, transformOf, type Gesture } from "@/lib/head-cases";

describe("resolveHeadCases", () => {
  it("is off with nothing set", () => {
    expect(resolveHeadCases({ search: "", stored: null, env: undefined })).toEqual({ enabled: false, persist: null });
  });
  it("?heads=1 turns it on and sticks, ?heads=0 turns it off and sticks", () => {
    expect(resolveHeadCases({ search: "?q=2026%20Q1&heads=1", stored: null, env: undefined })).toEqual({ enabled: true, persist: "1" });
    expect(resolveHeadCases({ search: "?heads=0", stored: "1", env: "1" })).toEqual({ enabled: false, persist: "0" });
  });
  it("a stored choice outlives the url and beats the env var", () => {
    expect(resolveHeadCases({ search: "", stored: "1", env: undefined }).enabled).toBe(true);
    expect(resolveHeadCases({ search: "", stored: "0", env: "1" }).enabled).toBe(false);
  });
  it("the env var turns it on for a browser that never chose", () => {
    expect(resolveHeadCases({ search: "", stored: null, env: "1" }).enabled).toBe(true);
    expect(resolveHeadCases({ search: "", stored: null, env: "true" }).enabled).toBe(false);
  });
});

describe("aimAt", () => {
  const from = { x: 500, y: 400 };
  it("looks right and up when the point is right and above", () => {
    const a = aimAt({ from, to: { x: 700, y: 200 } });
    expect(a.yaw).toBeGreaterThan(0);
    expect(a.pitch).toBeGreaterThan(0);
  });
  it("looks left and down for the opposite corner, symmetrically", () => {
    const a = aimAt({ from, to: { x: 700, y: 200 } });
    const b = aimAt({ from, to: { x: 300, y: 600 } });
    expect(b.yaw).toBeCloseTo(-a.yaw);
    expect(b.pitch).toBeCloseTo(-a.pitch);
  });
  it("never exceeds the clamps however far the point is", () => {
    const a = aimAt({ from, to: { x: 99999, y: -99999 } });
    expect(a).toEqual({ yaw: MAX_YAW, pitch: MAX_PITCH });
  });
  it("is at rest on the point itself", () => {
    expect(aimAt({ from, to: from })).toEqual({ yaw: 0, pitch: 0 });
  });
});

describe("gesturePose", () => {
  const kinds = Object.keys(GESTURE_MS) as Gesture[];
  it("every gesture starts and ends at rest (a spin ends one full turn on)", () => {
    for (const kind of kinds) {
      const start = gesturePose(kind, 0);
      const end = gesturePose(kind, 1);
      for (const key of ["pitch", "roll", "lift"] as const) {
        expect(start[key] ?? 0, `${kind} ${key} at 0`).toBeCloseTo(0, 5);
        expect(end[key] ?? 0, `${kind} ${key} at 1`).toBeCloseTo(0, 5);
      }
      expect(start.scale ?? 1).toBeCloseTo(1, 5);
      expect(end.scale ?? 1).toBeCloseTo(1, 5);
      expect(end.yaw ?? 0).toBe(kind === "spin" ? 360 : 0);
    }
  });
  it("a sneeze tips back before SNEEZE_AT and snaps forward right after", () => {
    expect(gesturePose("sneeze", SNEEZE_AT - 0.06).pitch).toBeGreaterThan(15);
    expect(gesturePose("sneeze", SNEEZE_AT + 0.05).pitch).toBeLessThan(-20);
  });
  it("say cheese faces the camera, gossip turns to the neighbour", () => {
    expect(gesturePose("cheese", 0.5).front).toBe(true);
    expect(gesturePose("gossip", 0.5).peer).toBe(true);
    expect(gesturePose("gossip", 0.5, -1).roll).toBeLessThan(0);
    expect(gesturePose("gossip", 0.5, 1).roll).toBeGreaterThan(0);
  });
  it("clamps t outside 0..1", () => {
    expect(gesturePose("spin", 7).yaw).toBe(360);
    expect(gesturePose("spin", -1).yaw).toBe(0);
  });
});

describe("transformOf", () => {
  it("writes every channel in a fixed order with perspective first", () => {
    expect(transformOf(REST)).toBe("perspective(600px) translateY(0.00px) rotateX(0.00deg) rotateY(0.00deg) rotateZ(0.00deg) scale(1.000)");
    expect(transformOf({ yaw: 12.345, pitch: -3, roll: 1, lift: -16, scale: 1.05 })).toContain("rotateY(12.35deg)");
  });
  it("backs the camera off for wide heads and never closer than 600px", () => {
    expect(transformOf(REST, 60)).toMatch(/^perspective\(600px\)/);
    expect(transformOf(REST, 540)).toMatch(/^perspective\(1080px\)/);
  });
});

describe("flyAt", () => {
  it("stays inside the box for the whole flight", () => {
    for (const seed of [0, 1.7, 42, 99.9]) {
      for (let t = 0; t <= 9000; t += 50) {
        const p = flyAt({ t, seed, w: 1400, h: 800 });
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1400);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(800);
      }
    }
  });
});
