import sharp from "sharp";
import { readdirSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

// Sketches become pure ink strokes on a transparent background: alpha is derived from
// stroke darkness, so the face blends into whatever paper the page paints.
const SRC = "assets/sketches";
const OUT = "public/faces/v3";
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
  const paper = percentile(px, 0.65);
  const ink = Math.min(percentile(px, 0.02), paper - 60);
  const range = Math.max(paper - ink, 1);
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < px.length; i++, j += 4) {
    const a = Math.pow(Math.max(0, Math.min(1, (paper - 14 - px[i]) / range)), 1.4);
    rgba[j] = INK.r;
    rgba[j + 1] = INK.g;
    rgba[j + 2] = INK.b;
    rgba[j + 3] = Math.round(a * 255);
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
}

// Crop around the ink bounding box so no head is ever sliced by a blind centre crop.
function inkBounds(rgba: Buffer, w: number, h: number) {
  let top = h, bottom = 0, left = w, right = 0;
  for (let yPos = 0; yPos < h; yPos++) {
    for (let xPos = 0; xPos < w; xPos++) {
      if (rgba[(yPos * w + xPos) * 4 + 3] > 32) {
        if (yPos < top) top = yPos;
        if (yPos > bottom) bottom = yPos;
        if (xPos < left) left = xPos;
        if (xPos > right) right = xPos;
      }
    }
  }
  return top > bottom ? { top: 0, bottom: h - 1, left: 0, right: w - 1 } : { top, bottom, left, right };
}

async function build(file: string) {
  const slug = file.replace(/\.png$/, "");
  const base = await toInk(file);
  const meta = await base.metadata();
  const w = meta.width!, h = meta.height!;
  const raw = await base.clone().raw().toBuffer();
  const bb = inkBounds(raw as Buffer, w, h);
  const targetH = Math.round((w * 5) / 4);
  let crop;
  if (targetH <= h) {
    const margin = Math.round(h * 0.03);
    const top = Math.max(0, Math.min(bb.top - margin, h - targetH));
    crop = { left: 0, top, width: w, height: targetH };
  } else {
    const targetW = Math.round((h * 4) / 5);
    const cx = Math.round((bb.left + bb.right) / 2);
    const left = Math.max(0, Math.min(cx - Math.round(targetW / 2), w - targetW));
    crop = { left, top: 0, width: targetW, height: h };
  }
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
