import type { Pose } from "@/lib/head-cases";
import type { HeadModel, Vec3 } from "./model";

export interface Expression {
  mouthOpen: number;
  smile: number;
  eyesClosed: number;
  browRaise: number;
}

export const NEUTRAL: Expression = { mouthOpen: 0, smile: 0, eyesClosed: 0, browRaise: 0 };

export interface DrawArgs {
  ctx: CanvasRenderingContext2D;
  model: HeadModel;
  center: { x: number; y: number };
  scale: number;
  pose: Pose;
  expression: Expression;
  look: { x: number; y: number };
  ink: string;
  red: string;
  hatch: CanvasPattern | null;
}

type Mat = [number, number, number, number, number, number, number, number, number];

// Yaw about y (positive turns the face to the viewer's right), pitch about x (positive
// looks up), roll about z; applied in that order.
export function rotation({ yaw, pitch, roll }: Pose): Mat {
  const y = (yaw * Math.PI) / 180, x = (-pitch * Math.PI) / 180, z = (roll * Math.PI) / 180;
  const cy = Math.cos(y), sy = Math.sin(y), cx = Math.cos(x), sx = Math.sin(x), cz = Math.cos(z), sz = Math.sin(z);
  const ry: Mat = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const rx: Mat = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const rz: Mat = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const mul = (a: Mat, b: Mat): Mat => {
    const o = new Array(9).fill(0) as Mat;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
    return o;
  };
  return mul(rz, mul(rx, ry));
}

const apply = (m: Mat, p: Vec3): Vec3 => [m[0] * p[0] + m[1] * p[1] + m[2] * p[2], m[3] * p[0] + m[4] * p[1] + m[5] * p[2], m[6] * p[0] + m[7] * p[1] + m[8] * p[2]];
const facing = (m: Mat, n: Vec3) => m[6] * n[0] + m[7] * n[1] + m[8] * n[2];

export function drawHead({ ctx, model, center, scale, pose, expression, look, ink, red, hatch }: DrawArgs) {
  const m = rotation(pose);
  const s = scale * pose.scale;
  const cx = center.x, cy = center.y + pose.lift;
  const sx = (p: Vec3) => cx + p[0] * s;
  const sy = (p: Vec3) => cy - p[1] * s;
  const line = Math.max(0.7, s * 0.026);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;

  drawBody(ctx, model, cx, center.y, scale, line);

  const { verts, faces, edges, hair } = model.mesh;
  const rot = verts.map((v) => apply(m, v));
  const front = new Uint8Array(faces.length);
  for (let i = 0; i < faces.length; i++) {
    const [a, b, c] = faces[i];
    const A = rot[a], B = rot[b], C = rot[c];
    const nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    front[i] = nz > 0 ? 1 : 0;
  }

  // Hair cap: the front-facing faces above the hairline, filled solid or hatched.
  const style = model.traits.hair.style;
  if (style !== "bald") {
    ctx.beginPath();
    for (let i = 0; i < faces.length; i++) {
      if (!front[i] || !hair[i]) continue;
      const [a, b, c] = faces[i];
      ctx.moveTo(sx(rot[a]), sy(rot[a]));
      ctx.lineTo(sx(rot[b]), sy(rot[b]));
      ctx.lineTo(sx(rot[c]), sy(rot[c]));
      ctx.closePath();
    }
    ctx.fillStyle = style === "hatch" && hatch ? hatch : ink;
    ctx.fill();
    if (style !== "hatch") {
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.fillStyle = ink;
  }

  // Silhouette: every edge between a front face and a back face; the hairline too.
  ctx.lineWidth = line * 1.15;
  ctx.beginPath();
  for (const [a, b, f, g] of edges) {
    const silhouette = front[f] !== front[g];
    const hairline = !silhouette && front[f] && hair[f] !== hair[g];
    if (!silhouette && !hairline) continue;
    ctx.moveTo(sx(rot[a]), sy(rot[a]));
    ctx.lineTo(sx(rot[b]), sy(rot[b]));
  }
  ctx.stroke();

  for (const st of model.strokes) {
    ctx.lineWidth = line * st.width;
    ctx.beginPath();
    let pen = false;
    const n = st.pts.length;
    for (let i = 0; i < n; i++) {
      const visible = facing(m, st.normals[i]) > st.threshold;
      if (!visible) {
        pen = false;
        continue;
      }
      const p = apply(m, st.pts[i]);
      if (pen) ctx.lineTo(sx(p), sy(p));
      else ctx.moveTo(sx(p), sy(p));
      pen = true;
    }
    if (st.closed && pen && facing(m, st.normals[0]) > st.threshold) {
      const p = apply(m, st.pts[0]);
      ctx.lineTo(sx(p), sy(p));
    }
    ctx.stroke();
  }

  const dotR = Math.max(0.5, s * 0.014);
  for (const d of model.dots) {
    if (facing(m, d.n) < 0.2) continue;
    const p = apply(m, d.p);
    ctx.beginPath();
    ctx.arc(sx(p), sy(p), dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  drawEyes({ ctx, model, m, s, sx, sy, line, expression, look });
  drawMouth({ ctx, model, m, s, sx, sy, line, expression, red, ink });
}

interface Local {
  ctx: CanvasRenderingContext2D;
  model: HeadModel;
  m: Mat;
  s: number;
  sx: (p: Vec3) => number;
  sy: (p: Vec3) => number;
  line: number;
  expression: Expression;
}

const lerp3 = (p: Vec3, u: Vec3, v: Vec3, a: number, b: number): Vec3 => [p[0] + u[0] * a + v[0] * b, p[1] + u[1] * a + v[1] * b, p[2] + u[2] * a + v[2] * b];

function path(ctx: CanvasRenderingContext2D, m: Mat, pts: Vec3[], sx: (p: Vec3) => number, sy: (p: Vec3) => number, close = false) {
  ctx.beginPath();
  pts.forEach((q, i) => {
    const p = apply(m, q);
    if (i === 0) ctx.moveTo(sx(p), sy(p));
    else ctx.lineTo(sx(p), sy(p));
  });
  if (close) ctx.closePath();
}

function drawEyes({ ctx, model, m, s, sx, sy, line, expression, look }: Local & { look: { x: number; y: number } }) {
  const t = model.traits;
  const a = t.eyeSize;
  const b = t.eyeSize * (0.55 + expression.browRaise * 0.35);
  for (const side of [-1, 1] as const) {
    const f = model.eye(side);
    if (facing(m, f.n) < -0.12) continue;
    ctx.lineWidth = line;
    if (expression.eyesClosed > 0.5) {
      const pts: Vec3[] = [];
      for (let i = 0; i <= 6; i++) {
        const k = -1 + (2 * i) / 6;
        pts.push(lerp3(f.p, f.u, f.v, k * a, -0.25 * a * (1 - k * k)));
      }
      path(ctx, m, pts, sx, sy);
      ctx.stroke();
      continue;
    }
    const pts: Vec3[] = [];
    for (let i = 0; i < 14; i++) {
      const k = (i / 14) * Math.PI * 2;
      pts.push(lerp3(f.p, f.u, f.v, a * Math.cos(k), b * Math.sin(k)));
    }
    path(ctx, m, pts, sx, sy, true);
    ctx.stroke();
    const pupil = apply(m, lerp3(f.p, f.u, f.v, look.x * a * 0.45, look.y * b * 0.4));
    ctx.beginPath();
    ctx.arc(sx(pupil), sy(pupil), Math.max(0.8, a * s * 0.32), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMouth({ ctx, model, m, s, sx, sy, line, expression, red, ink }: Local & { red: string; ink: string }) {
  const f = model.mouth;
  if (facing(m, f.n) < -0.15) return;
  const w = model.traits.mouthWidth;
  const smile = model.traits.smile * 0.5 + expression.smile;
  ctx.lineWidth = line;
  if (expression.mouthOpen > 0.12) {
    const h = w * 0.9 * expression.mouthOpen;
    const pts: Vec3[] = [];
    for (let i = 0; i < 16; i++) {
      const k = (i / 16) * Math.PI * 2;
      pts.push(lerp3(f.p, f.u, f.v, w * 0.7 * Math.cos(k), -h * 0.2 + h * Math.sin(k)));
    }
    path(ctx, m, pts, sx, sy, true);
    ctx.fillStyle = ink;
    ctx.fill();
    const tongue: Vec3[] = [];
    for (let i = 0; i <= 10; i++) {
      const k = Math.PI + (i / 10) * Math.PI;
      tongue.push(lerp3(f.p, f.u, f.v, w * 0.45 * Math.cos(k), -h * 0.45 + h * 0.5 * Math.sin(k)));
    }
    path(ctx, m, tongue, sx, sy, true);
    ctx.fillStyle = red;
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.stroke();
    return;
  }
  const pts: Vec3[] = [];
  for (let i = 0; i <= 8; i++) {
    const k = -1 + (2 * i) / 8;
    pts.push(lerp3(f.p, f.u, f.v, k * w, smile * w * 0.35 * (k * k) - (smile > 0 ? smile * w * 0.2 : 0)));
  }
  path(ctx, m, pts, sx, sy);
  ctx.stroke();
  if (smile > 0.6) {
    ctx.lineWidth = line * 0.8;
    path(ctx, m, [lerp3(f.p, f.u, f.v, -w * 1.05, smile * w * 0.3), lerp3(f.p, f.u, f.v, -w * 0.95, -w * 0.05)], sx, sy);
    ctx.stroke();
    path(ctx, m, [lerp3(f.p, f.u, f.v, w * 1.05, smile * w * 0.3), lerp3(f.p, f.u, f.v, w * 0.95, -w * 0.05)], sx, sy);
    ctx.stroke();
  }
}

// The body does not turn with the head: a neck under the chin and shoulders to the edges.
function drawBody(ctx: CanvasRenderingContext2D, model: HeadModel, cx: number, cy: number, s: number, line: number) {
  const t = model.traits;
  const chin = cy + t.ry * t.chin * s * 0.9;
  const neckW = 0.34 * s;
  const shoulderY = chin + 0.62 * s;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(cx - neckW, chin - 0.15 * s);
  ctx.lineTo(cx - neckW * 1.05, shoulderY);
  ctx.quadraticCurveTo(cx - neckW * 1.4, shoulderY + 0.05 * s, cx - 1.9 * s, shoulderY + 0.45 * s);
  ctx.lineTo(cx - 2.6 * s, shoulderY + 0.7 * s);
  ctx.moveTo(cx + neckW, chin - 0.15 * s);
  ctx.lineTo(cx + neckW * 1.05, shoulderY);
  ctx.quadraticCurveTo(cx + neckW * 1.4, shoulderY + 0.05 * s, cx + 1.9 * s, shoulderY + 0.45 * s);
  ctx.lineTo(cx + 2.6 * s, shoulderY + 0.7 * s);
  ctx.moveTo(cx - neckW * 1.5, shoulderY + 0.02 * s);
  ctx.quadraticCurveTo(cx, shoulderY + 0.45 * s, cx + neckW * 1.5, shoulderY + 0.02 * s);
  ctx.stroke();
}
