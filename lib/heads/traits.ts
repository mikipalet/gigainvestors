export type HairStyle = "solid" | "hatch" | "bald" | "long";

export interface Traits {
  seed: number;
  rx: number;
  ry: number;
  rz: number;
  jaw: number;
  chin: number;
  faceFlat: number;
  eyeSize: number;
  eyeSpread: number;
  eyeHeight: number;
  browLift: number;
  noseLen: number;
  noseWidth: number;
  mouthWidth: number;
  smile: number;
  earSize: number;
  hair: { style: HairStyle; line: number; recede: number; part: number };
  glasses: { round: boolean; size: number } | null;
  stubble: number;
  moustache: boolean;
  freckles: boolean;
}

export interface SketchHair {
  crown: number;
  sides: number;
}

export function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// mulberry32: deterministic so a head looks the same every visit.
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INK = 40;

// How much ink the sketch puts on the crown and down the sides of the head, as fractions
// of those regions, read off the head ellipse the sketch itself gives us.
export function sketchHair({ alpha, w, h, head }: { alpha: Uint8Array | Uint8ClampedArray; w: number; h: number; head: { cx: number; cy: number; rx: number; ry: number } }): SketchHair {
  const sample = (x0: number, x1: number, y0: number, y1: number) => {
    let n = 0;
    let ink = 0;
    for (let y = Math.max(0, Math.floor(y0 * h)); y < Math.min(h, y1 * h); y++) {
      for (let x = Math.max(0, Math.floor(x0 * w)); x < Math.min(w, x1 * w); x++) {
        n++;
        if (alpha[y * w + x] > INK) ink++;
      }
    }
    return n ? ink / n : 0;
  };
  const crown = sample(head.cx - head.rx * 0.55, head.cx + head.rx * 0.55, head.cy - head.ry * 0.95, head.cy - head.ry * 0.45);
  const sides = (sample(head.cx - head.rx * 1.25, head.cx - head.rx * 0.95, head.cy, head.cy + head.ry * 0.9) + sample(head.cx + head.rx * 0.95, head.cx + head.rx * 1.25, head.cy, head.cy + head.ry * 0.9)) / 2;
  return { crown, sides };
}

export function traitsFor(seed: number, sketch?: SketchHair): Traits {
  const r = rng(seed);
  const pick = (lo: number, hi: number) => lo + r() * (hi - lo);
  const crown = sketch?.crown ?? pick(0.1, 0.5);
  const sides = sketch?.sides ?? 0;
  const style: HairStyle = sides > 0.22 ? "long" : crown > 0.34 ? "solid" : crown > 0.09 ? "hatch" : "bald";
  return {
    seed,
    rx: pick(0.86, 1.05),
    ry: pick(1.12, 1.32),
    rz: pick(0.95, 1.12),
    jaw: pick(0.12, 0.42),
    chin: pick(0.92, 1.12),
    faceFlat: pick(0.82, 0.95),
    eyeSize: pick(0.075, 0.13),
    eyeSpread: pick(0.36, 0.5),
    eyeHeight: pick(0.08, 0.2),
    browLift: pick(0.12, 0.2),
    noseLen: pick(0.14, 0.28),
    noseWidth: pick(0.07, 0.13),
    mouthWidth: pick(0.2, 0.32),
    smile: pick(-0.2, 0.5),
    earSize: pick(0.12, 0.2),
    hair: { style, line: style === "bald" ? 0.9 : pick(0.34, 0.55), recede: style === "hatch" ? pick(0.1, 0.35) : pick(0, 0.2), part: r() < 0.5 ? -1 : 1 },
    glasses: r() < 0.45 ? { round: r() < 0.45, size: pick(1.15, 1.5) } : null,
    stubble: r() < 0.35 ? pick(0.3, 1) : 0,
    moustache: r() < 0.12,
    freckles: r() < 0.25,
  };
}
