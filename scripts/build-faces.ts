import sharp from "sharp";
import { readdirSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const SRC = "assets/sketches";
const OUT = "public/faces";
const WIDTHS = [320, 1200] as const;
mkdirSync(OUT, { recursive: true });

async function build(file: string) {
  const slug = file.replace(/\.png$/, "");
  const base = sharp(path.join(SRC, file)).grayscale();
  const meta = await base.metadata();
  const w = meta.width!, h = meta.height!;
  const targetH = Math.round((w * 5) / 4);
  const crop = targetH <= h
    ? { left: 0, top: Math.max(0, Math.round((h - targetH) / 2)), width: w, height: targetH }
    : { left: Math.round((w - Math.round((h * 4) / 5)) / 2), top: 0, width: Math.round((h * 4) / 5), height: h };
  let bytes = 0;
  for (const width of WIDTHS) {
    const img = base.clone().extract(crop).resize({ width });
    await img.clone().avif({ quality: 45, effort: 6 }).toFile(`${OUT}/${slug}-${width}.avif`);
    await img.clone().webp({ quality: 70 }).toFile(`${OUT}/${slug}-${width}.webp`);
    bytes += statSync(`${OUT}/${slug}-${width}.avif`).size;
  }
  return bytes;
}

(async () => {
  const only = process.argv[2];
  const files = readdirSync(SRC).filter((f) => f.endsWith(".png") && (!only || f === only));
  let total = 0;
  for (const f of files) {
    const b = await build(f);
    total += b;
  }
  const s320 = files.reduce((a, f) => a + statSync(`${OUT}/${f.replace(/\.png$/, "")}-320.avif`).size, 0);
  console.log(`${files.length} faces. avif total ${(total / 1024).toFixed(0)} KB, 320px set ${(s320 / 1024).toFixed(0)} KB`);
})();
