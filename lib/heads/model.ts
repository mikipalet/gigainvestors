import { rng, type Traits } from "./traits";

export type Vec3 = [number, number, number];

export interface Stroke {
  pts: Vec3[];
  normals: Vec3[];
  threshold: number;
  width: number;
  closed?: boolean;
}

export interface Mesh {
  verts: Vec3[];
  faces: [number, number, number][];
  edges: [number, number, number, number][];
  hair: Uint8Array;
}

export interface HeadModel {
  traits: Traits;
  mesh: Mesh;
  strokes: Stroke[];
  dots: { p: Vec3; n: Vec3 }[];
  eye: (side: -1 | 1) => { p: Vec3; n: Vec3; u: Vec3; v: Vec3 };
  mouth: { p: Vec3; n: Vec3; u: Vec3; v: Vec3 };
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// Head space: y up, z toward the viewer, unit skull half width. th sweeps around the
// vertical axis (0 = face), ph from the chin (-pi/2) to the crown (pi/2).
export function surface(t: Traits) {
  const point = (th: number, ph: number): Vec3 => {
    const c = Math.cos(ph);
    const s = Math.sin(ph);
    let x = t.rx * c * Math.sin(th);
    let y = t.ry * s;
    let z = t.rz * c * Math.cos(th);
    if (s < 0) {
      const u = s * s;
      x *= 1 - t.jaw * u;
      z *= 1 - t.jaw * 0.6 * u;
      y *= t.chin;
    }
    z *= 1 - (1 - t.faceFlat) * Math.max(0, Math.cos(th));
    return [x, y, z];
  };
  const normal = (th: number, ph: number): Vec3 => {
    const e = 0.01;
    const p = point(th, ph);
    const du = sub(point(th + e, ph), point(th - e, ph));
    const dv = sub(point(th, Math.min(1.56, ph + e)), point(th, Math.max(-1.56, ph - e)));
    const n = norm(cross(du, dv));
    return dot(n, p) < 0 ? mul(n, -1) : n;
  };
  const frame = (th: number, ph: number) => {
    const p = point(th, ph);
    const n = normal(th, ph);
    const u = norm(cross([0, 1, 0], n));
    const v = norm(cross(n, u));
    return { p, n, u, v };
  };
  return { point, normal, frame };
}

function hairline(t: Traits, th: number) {
  const a = Math.abs(th);
  const back = a > Math.PI / 2 ? -0.55 * ((a - Math.PI / 2) / (Math.PI / 2)) : 0;
  const temple = t.hair.recede * Math.exp(-((a - 0.85) ** 2) / 0.12);
  const fringe = 0.03 * Math.sin(3 * th + t.seed);
  return t.hair.line + temple + back + fringe;
}

function buildMesh(t: Traits, cols: number, rows: number): Mesh {
  const { point, normal } = surface(t);
  const wobble = rng(t.seed ^ 0x9e37);
  const verts: Vec3[] = [];
  const ring: number[][] = [];
  for (let i = 0; i <= rows; i++) {
    const ph = -Math.PI / 2 + (Math.PI * i) / rows;
    const ids: number[] = [];
    if (i === 0 || i === rows) {
      const pole = verts.push(point(0, ph)) - 1;
      ring.push(new Array(cols).fill(pole));
      continue;
    }
    for (let j = 0; j < cols; j++) {
      const th = (2 * Math.PI * j) / cols;
      ids.push(verts.push(add(point(th, ph), mul(normal(th, ph), (wobble() - 0.5) * 0.016))) - 1);
    }
    ring.push(ids);
  }
  const faces: [number, number, number][] = [];
  const hairFlags: number[] = [];
  const edgeMap = new Map<string, [number, number, number, number]>();
  const edge = (a: number, b: number, f: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    const e = edgeMap.get(key);
    if (e) e[3] = f;
    else edgeMap.set(key, [a, b, f, -1]);
  };
  for (let i = 0; i < rows; i++) {
    const ph = -Math.PI / 2 + (Math.PI * (i + 0.5)) / rows;
    for (let j = 0; j < cols; j++) {
      const th = ((2 * Math.PI * (j + 0.5)) / cols + Math.PI) % (2 * Math.PI) - Math.PI;
      const a = ring[i][j], b = ring[i][(j + 1) % cols], c = ring[i + 1][(j + 1) % cols], d = ring[i + 1][j];
      const inHair = t.hair.style !== "bald" && ph > hairline(t, th) ? 1 : 0;
      for (const tri of [[a, b, c], [a, c, d]] as [number, number, number][]) {
        if (tri[0] === tri[1] || tri[1] === tri[2] || tri[0] === tri[2]) continue;
        if (!outward(verts, tri)) [tri[1], tri[2]] = [tri[2], tri[1]];
        const f = faces.push(tri) - 1;
        hairFlags.push(inHair);
        edge(tri[0], tri[1], f);
        edge(tri[1], tri[2], f);
        edge(tri[2], tri[0], f);
      }
    }
  }
  return { verts, faces, edges: [...edgeMap.values()].filter((e) => e[3] >= 0), hair: Uint8Array.from(hairFlags) };
}

// Every face winds counter-clockwise seen from outside, so a rotated face is front-facing
// exactly when its projected area is positive.
function outward(verts: Vec3[], [a, b, c]: [number, number, number]) {
  const n = cross(sub(verts[b], verts[a]), sub(verts[c], verts[a]));
  const centre = mul(add(add(verts[a], verts[b]), verts[c]), 1 / 3);
  return dot(n, centre) >= 0;
}

function arc(center: Vec3, u: Vec3, v: Vec3, a: number, b: number, from: number, to: number, n: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const s = from + ((to - from) * i) / n;
    out.push(add(center, add(mul(u, a * Math.cos(s)), mul(v, b * Math.sin(s)))));
  }
  return out;
}

export type Detail = "fine" | "mid" | "coarse";

export function buildHead(t: Traits, detail: Detail): HeadModel {
  const S = surface(t);
  const r = rng(t.seed ^ 0x51ed);
  const strokes: Stroke[] = [];
  const dots: { p: Vec3; n: Vec3 }[] = [];
  const lift = (p: Vec3, n: Vec3, k: number) => add(p, mul(n, k));
  const on = (pts: Vec3[], n: Vec3, threshold = 0.05, width = 1): Stroke => ({ pts, normals: pts.map(() => n), threshold, width });

  // Brows.
  for (const side of [-1, 1] as const) {
    const f = S.frame(side * t.eyeSpread, t.eyeHeight + t.browLift);
    strokes.push(on(arc(f.p, f.u, f.v, t.eyeSize * 1.5, t.eyeSize * 0.5, 0.35, Math.PI - 0.35, 5), f.n, 0.05, 1.3));
  }

  // Nose: the bridge runs down the face, the tip stands off it, one nostril hooks back.
  {
    const bridge = S.frame(0, t.eyeHeight - 0.02);
    const base = S.frame(0, -0.14);
    const tip = lift(S.point(0, -0.08), S.normal(0, -0.08), t.noseLen);
    const nostril = S.frame(t.noseWidth * 1.6, -0.16);
    const pts: Vec3[] = [bridge.p, lift(S.point(0, 0.02), bridge.n, t.noseLen * 0.35), tip, lift(base.p, base.n, t.noseLen * 0.25), nostril.p];
    strokes.push({ pts, normals: pts.map(() => bridge.n), threshold: -0.45, width: 1 });
  }

  // Ears stick out sideways just behind the equator.
  for (const side of [-1, 1] as const) {
    const f = S.frame(side * 1.55, 0.02);
    const out = mul(f.n, 1);
    const up: Vec3 = [0, 1, 0];
    const pts = arc(f.p, out, up, t.earSize * 1.1, t.earSize * 1.4, -Math.PI / 2, Math.PI / 2, 7);
    strokes.push({ pts, normals: pts.map(() => f.n), threshold: -0.35, width: 1 });
  }

  // Glasses: lenses float in front of the eyes, temples run back to the ears.
  if (t.glasses) {
    const g = t.glasses;
    for (const side of [-1, 1] as const) {
      const f = S.frame(side * t.eyeSpread, t.eyeHeight);
      const c = lift(f.p, f.n, 0.07);
      const a = t.eyeSize * g.size, b = t.eyeSize * g.size * (g.round ? 1 : 0.8);
      const pts = g.round ? arc(c, f.u, f.v, a, b, 0, Math.PI * 2, 14) : [add(c, add(mul(f.u, -a), mul(f.v, b))), add(c, add(mul(f.u, a), mul(f.v, b))), add(c, add(mul(f.u, a), mul(f.v, -b))), add(c, add(mul(f.u, -a), mul(f.v, -b)))];
      strokes.push({ pts, normals: pts.map(() => f.n), threshold: 0.0, width: 1.3, closed: true });
      const outer = add(c, mul(f.u, side * a));
      const ear = S.frame(side * 1.45, 0.08);
      const mid = S.frame(side * 1.0, 0.1);
      const temple = [outer, lift(mid.p, mid.n, 0.06), lift(ear.p, ear.n, 0.02)];
      strokes.push({ pts: temple, normals: [f.n, mid.n, ear.n], threshold: -0.05, width: 1 });
    }
    const f = S.frame(0, t.eyeHeight);
    const a = t.eyeSize * g.size;
    strokes.push(on([add(lift(f.p, f.n, 0.07), mul(f.u, -(t.eyeSpread * 0.9 - a) * 0.9)), add(lift(f.p, f.n, 0.07), mul(f.u, (t.eyeSpread * 0.9 - a) * 0.9))], f.n, 0.05, 1));
  }

  // Hair on top of a hatched or solid cap: strands, loops for the curly.
  if (t.hair.style !== "bald") {
    const n = detail === "coarse" ? 10 : 26;
    for (let i = 0; i < n; i++) {
      const th = (r() - 0.5) * 2.6;
      const ph = hairline(t, th) + 0.04 + r() * 0.5;
      const f = S.frame(th, Math.min(1.5, ph));
      const dir = add(mul(f.u, t.hair.part * 0.6 + (r() - 0.5) * 0.4), mul(f.v, -0.5 - r() * 0.5));
      const pts = [lift(f.p, f.n, 0.02), lift(add(f.p, mul(norm(dir), 0.14 + r() * 0.16)), f.n, 0.04)];
      strokes.push({ pts, normals: [f.n, f.n], threshold: 0.1, width: 0.9 });
    }
  }
  if (t.hair.style === "long") {
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < (detail === "coarse" ? 2 : 4); i++) {
        const th = side * (1.15 + i * 0.12);
        const top = S.frame(th, 0.35);
        const pts: Vec3[] = [];
        for (let k = 0; k <= 5; k++) {
          const ph = 0.35 - (k / 5) * 1.5;
          const f = S.frame(th, Math.max(-1.5, ph));
          pts.push(lift(f.p, f.n, 0.08 + k * 0.03 + i * 0.02));
        }
        strokes.push({ pts, normals: pts.map(() => top.n), threshold: -0.3, width: 1 });
      }
    }
  }

  // Stubble and freckles are dots on the lower face and cheeks.
  const dotCount = detail === "coarse" ? 0.35 : 1;
  if (t.stubble > 0) {
    for (let i = 0; i < 70 * t.stubble * dotCount; i++) {
      const th = (r() - 0.5) * 1.6;
      const ph = -0.55 + r() * 0.42;
      if (Math.abs(th) < 0.35 && ph > -0.42) continue;
      dots.push({ p: S.point(th, ph), n: S.normal(th, ph) });
    }
  }
  if (t.freckles) {
    for (let i = 0; i < 24 * dotCount; i++) {
      const th = (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.45);
      const ph = -0.15 + r() * 0.22;
      dots.push({ p: S.point(th, ph), n: S.normal(th, ph) });
    }
  }
  if (t.moustache) {
    const f = S.frame(0, -0.24);
    strokes.push(on(arc(f.p, f.u, f.v, t.mouthWidth * 0.8, 0.05, Math.PI + 0.3, 2 * Math.PI - 0.3, 6), f.n, 0.05, 2.2));
  }

  const [cols, rows] = detail === "fine" ? [40, 26] : detail === "mid" ? [24, 16] : [14, 10];
  return {
    traits: t,
    mesh: buildMesh(t, cols, rows),
    strokes,
    dots,
    eye: (side) => S.frame(side * t.eyeSpread, t.eyeHeight),
    mouth: S.frame(0, -0.36),
  };
}
