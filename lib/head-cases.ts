export const HEAD_CASES_KEY = "head-cases";

// Off unless asked for: `?heads=1` sticks in this browser, `?heads=0` clears it, and the
// build-time env var turns it on for everyone. A stored "0" beats the env var so one
// browser can opt out of a global rollout.
export function resolveHeadCases({ search, stored, env }: { search: string; stored: string | null; env: string | undefined }) {
  const param = new URLSearchParams(search).get("heads");
  if (param === "1" || param === "0") return { enabled: param === "1", persist: param };
  return { enabled: stored === "1" || (stored !== "0" && env === "1"), persist: null };
}

export interface Pt {
  x: number;
  y: number;
}

export interface Pose {
  yaw: number;
  pitch: number;
  roll: number;
  lift: number;
  scale: number;
}

export const REST: Pose = { yaw: 0, pitch: 0, roll: 0, lift: 0, scale: 1 };
export const MAX_YAW = 55;
export const MAX_PITCH = 28;
const DEPTH = 520;
const DEG = 180 / Math.PI;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Positive yaw turns the face toward the viewer's right, positive pitch tips it back to
// look up. DEPTH is the virtual distance between the head and the glass: a point 520px
// away pulls a 45° turn, which the clamp trims to MAX_YAW.
export function aimAt({ from, to }: { from: Pt; to: Pt }) {
  return {
    yaw: clamp(Math.atan2(to.x - from.x, DEPTH) * DEG, -MAX_YAW, MAX_YAW),
    pitch: clamp(Math.atan2(from.y - to.y, DEPTH) * DEG, -MAX_PITCH, MAX_PITCH),
  };
}

export type Gesture = "spin" | "wave" | "sneeze" | "yawn" | "cheese" | "gossip";

export const GESTURE_MS: Record<Gesture, number> = { spin: 700, wave: 900, sneeze: 1100, yawn: 1600, cheese: 1200, gossip: 2600 };

export const SNEEZE_AT = 0.5;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const bump = (t: number) => Math.pow(Math.sin(Math.PI * t), 0.7);

export interface GestureFrame extends Partial<Pose> {
  front?: boolean;
  peer?: boolean;
}

// t runs 0..1 over GESTURE_MS[kind]; dir is -1 or 1 (which way a gossip lean goes).
export function gesturePose(kind: Gesture, t: number, dir = 1): GestureFrame {
  const u = clamp(t, 0, 1);
  switch (kind) {
    case "spin":
      return { yaw: 360 * easeInOut(u) };
    case "wave":
      return { lift: -16 * Math.sin(Math.PI * u), pitch: 8 * Math.sin(Math.PI * u) };
    case "sneeze": {
      if (u < 0.45) return { pitch: 20 * easeOut(u / 0.45) };
      if (u < SNEEZE_AT + 0.05) return { pitch: 20 - 46 * ((u - 0.45) / 0.1), lift: 4 };
      const back = easeOut((u - 0.55) / 0.45);
      return { pitch: -26 * (1 - back), lift: 4 * (1 - back) };
    }
    case "yawn": {
      const b = bump(u);
      return { pitch: 22 * b, scale: 1 + 0.05 * b, roll: 3 * b };
    }
    case "cheese": {
      const b = Math.sin(Math.PI * u);
      return { front: true, scale: 1 + 0.07 * b, pitch: 5 * b, lift: -3 * b };
    }
    case "gossip":
      return { peer: true, roll: 7 * Math.sin(Math.PI * u) * dir, lift: -2 * Math.sin(Math.PI * u) };
  }
}

export const FLY_MS = 9000;

// A meandering path that never leaves the middle 90% of the box; seed picks the route.
export function flyAt({ t, seed, w, h }: { t: number; seed: number; w: number; h: number }) {
  const s = t / 1000;
  const x = w * (0.5 + 0.42 * Math.sin(s * 0.9 + seed) * Math.cos(s * 0.31 + seed * 2) + 0.01 * Math.sin(s * 23));
  const y = h * (0.5 + 0.38 * Math.sin(s * 0.7 + seed * 1.3) * Math.sin(s * 0.23 + seed) + 0.012 * Math.cos(s * 19));
  return { x, y };
}
