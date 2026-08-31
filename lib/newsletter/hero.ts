import sharp from "sharp";
import path from "node:path";
import { existsSync } from "node:fs";
import type { Issue } from "./issue";

const PAPER = "#f4f2ec";
const BUY = "#257a4a";
const SELL = "#bf3b2b";

// Faces ledger: the lead investor large on the left; everyone who bought or sold the same
// stock in a grid on the right, each with a green or red rule underneath.
export async function renderHero(issue: Issue, slugsByLastName: Record<string, string>, outFile: string): Promise<boolean> {
  const lead = issue.lead;
  if (!lead) return false;
  const face = (slug: string) => path.join(process.cwd(), "public", "faces", "png", `${slug}.png`);
  if (!existsSync(face(lead.slug))) return false;
  const W = 1104;
  const comps: sharp.OverlayOptions[] = [];
  const leadImg = await sharp(face(lead.slug)).resize({ width: 192, height: 240, fit: "inside" }).toBuffer();
  comps.push({ input: leadImg, left: 24, top: 24 });
  const leadRule = Buffer.from(`<svg width="192" height="8"><rect width="192" height="8" fill="${BUY}"/></svg>`);
  comps.push({ input: leadRule, left: 24, top: 272 });
  const label = Buffer.from(
    `<svg width="360" height="60"><text x="0" y="24" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="700" fill="#111">${escape(lead.person)}</text><text x="0" y="52" font-family="DejaVu Sans, sans-serif" font-size="20" fill="${BUY}">+${escape(money(lead.dollars))} ${escape(lead.ticker)}</text></svg>`,
  );
  comps.push({ input: label, left: 236, top: 30 });

  const others = [...lead.bought.map((n) => ({ n, dir: BUY })), ...lead.sold.map((n) => ({ n, dir: SELL }))].filter((o) => slugsByLastName[o.n] && slugsByLastName[o.n] !== lead.slug).slice(0, 27);
  const cell = 84;
  const cols = 9;
  const buys = lead.bought.filter((n) => n !== lastName(lead.person)).length;
  const sells = lead.sold.length;
  const caption = Buffer.from(`<svg width="700" height="24"><text x="0" y="16" font-family="DejaVu Sans, sans-serif" font-size="14" fill="#111" opacity="0.6">${escape(`${lead.ticker} in ${issue.quarter}: ${buys} others bought (green), ${sells} sold (red)`)}</text></svg>`);
  comps.push({ input: caption, left: 236, top: 88 });
  const rows = Math.ceil(others.length / cols);
  const H = Math.max(300, 118 + rows * (cell + 10) + 6);
  let i = 0;
  for (const o of others) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = 236 + col * (cell + 12);
    const top = 118 + row * (cell + 10);
    const img = await sharp(face(slugsByLastName[o.n])).resize({ width: cell - 16, height: cell - 24, fit: "inside" }).toBuffer();
    comps.push({ input: img, left: left + 8, top });
    comps.push({ input: Buffer.from(`<svg width="${cell - 16}" height="4"><rect width="${cell - 16}" height="4" fill="${o.dir}"/></svg>`), left: left + 8, top: top + cell - 20 });
    i++;
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: PAPER } }).composite(comps).png({ compressionLevel: 9 }).toFile(outFile);
  return true;
}

const money = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${Math.round(n / 1e6)}M` : `$${Math.round(n / 1e3)}K`);
const lastName = (p: string) => p.split(" ").pop() ?? p;
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
