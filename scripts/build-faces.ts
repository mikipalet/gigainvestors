import sharp from "sharp";
import { readdirSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

// Sketches become pure ink strokes on a transparent background: alpha is derived from
// stroke darkness, so the face blends into whatever paper the page paints.
const SRC = "assets/sketches";
const OUT = "public/faces";
const WIDTHS = [320, 1200] as const;
const INK = { r: 17, g: 17, b: 17 };
mkdirSync(OUT, { recursive: true });

function percentile(data: Uint8Array, p: number) {
  const hist = new Uint32Array(256);
  for (const v of data) hist[v]++;
  let acc = 0;
  const target = data.length * p;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return 255;
}

async function toInk(file: string) {
  const gray = sharp(path.join(SRC, file)).grayscale();
  const { data, info } = await gray.raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const paper = percentile(px, 0.6);
  const ink = Math.min(percentile(px, 0.02), paper - 60);
  const range = Math.max(paper - ink, 1);
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < px.length; i++, j += 4) {
    const a = Math.max(0, Math.min(1, (paper - 8 - px[i]) / range));
    rgba[j] = INK.r;
    rgba[j + 1] = INK.g;
    rgba[j + 2] = INK.b;
    rgba[j + 3] = Math.round(a * 255);
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
}

async function build(file: string) {
  const slug = file.replace(/\.png$/, "");
  const base = await toInk(file);
  const meta = await base.metadata();
  const w = meta.width!, h = meta.height!;
  const targetH = Math.round((w * 5) / 4);
  const crop = targetH <= h
    ? { left: 0, top: Math.max(0, Math.round((h - targetH) / 2)), width: w, height: targetH }
    : { left: Math.round((w - Math.round((h * 4) / 5)) / 2), top: 0, width: Math.round((h * 4) / 5), height: h };
  const cropped = await base.extract(crop).png().toBuffer();
  let bytes = 0;
  for (const width of WIDTHS) {
    const img = sharp(cropped).resize({ width });
    await img.clone().avif({ quality: 50, effort: 4 }).toFile(`${OUT}/${slug}-${width}.avif`);
    await img.clone().webp({ quality: 75, alphaQuality: 80 }).toFile(`${OUT}/${slug}-${width}.webp`);
    bytes += statSync(`${OUT}/${slug}-${width}.avif`).size;
  }
  return bytes;
}

(async () => {
  const only = process.argv[2];
  const files = readdirSync(SRC).filter((f) => f.endsWith(".png") && (!only || f === only));
  let total = 0;
  for (const f of files) total += await build(f);
  const s320 = files.reduce((a, f) => a + statSync(`${OUT}/${f.replace(/\.png$/, "")}-320.avif`).size, 0);
  console.log(`${files.length} faces. avif total ${(total / 1024).toFixed(0)} KB, 320px set ${(s320 / 1024).toFixed(0)} KB`);
})();
