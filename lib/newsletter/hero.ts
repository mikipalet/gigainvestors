import sharp from "sharp";
import path from "node:path";
import { writeFileSync } from "node:fs";
import { layout } from "../treemap/layout";
import { formatMoney } from "../format";
import type { Facts } from "./issue";

const PAPER = "#f4f2ec";
const INK = "#111111";
const BUY = "#257a4a";
const SELL = "#bf3b2b";
const W = 1200;
const H = 640;

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The site's own picture of the quarter: the lead investor's book as a treemap, this quarter's
// buys in green and sells in red, the lead position labelled with the move.
export async function renderHero(facts: Facts, outFile: string): Promise<boolean> {
  const lead = facts.lead;
  if (!lead || lead.book.length === 0) return false;
  const pad = 3;
  const TOP = 12;
  const ranked = [...lead.book].sort((a, b) => b.value - a.value);
  const head = ranked.slice(0, TOP);
  const tail = ranked.slice(TOP);
  const tailValue = tail.reduce((s, p) => s + p.value, 0);
  const shown = tailValue > 0 ? [...head, { ticker: "__rest", value: tailValue, activity: "hold" as const, change: null }] : head;
  const rects = layout(
    shown.map((p) => ({ id: p.ticker, value: p.value })),
    W - 2 * pad,
    H - 2 * pad,
    pad,
  );
  const byTicker = new Map(shown.map((p) => [p.ticker, p]));
  const bookTotal = lead.book.reduce((s, b) => s + b.value, 0);
  const parts: string[] = [];
  for (const r of rects) {
    const p = byTicker.get(r.id)!;
    if (r.id === "__rest") {
      parts.push(`<rect x="${r.x + pad}" y="${r.y + pad}" width="${r.w}" height="${r.h}" fill="${PAPER}"/>`);
      parts.push(`<rect x="${r.x + pad + 0.5}" y="${r.y + pad + 0.5}" width="${r.w - 1}" height="${r.h - 1}" fill="none" stroke="${INK}" stroke-opacity="0.18"/>`);
      const fs = Math.max(13, Math.min(24, Math.sqrt(r.w * r.h) / 8));
      parts.push(`<text x="${r.x + pad + fs * 0.5}" y="${r.y + pad + fs * 1.4}" font-family="Inter" font-size="${fs}" fill="${INK}" fill-opacity="0.55">${tail.length} smaller</text>`);
      continue;
    }
    const isLead = p.ticker === lead.ticker;
    const buy = p.activity === "new" || p.activity === "add";
    const sell = p.activity === "reduce";
    const strength = Math.min(1, Math.abs(p.change ?? (p.activity === "new" ? 100 : 0)) / 50);
    const fill = isLead ? (lead.activity === "sold" || lead.activity === "reduce" ? SELL : BUY) : buy ? BUY : sell ? SELL : PAPER;
    const opacity = isLead ? 1 : buy || sell ? 0.18 + 0.32 * strength : 1;
    const x = r.x + pad;
    const y = r.y + pad;
    parts.push(`<rect x="${x}" y="${y}" width="${r.w}" height="${r.h}" fill="${fill}" fill-opacity="${opacity}"/>`);
    if (!isLead) parts.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${r.w - 1}" height="${r.h - 1}" fill="none" stroke="${INK}" stroke-opacity="0.18"/>`);
    const fs = Math.max(15, Math.min(34, Math.sqrt(r.w * r.h) / 6.5));
    const ink = isLead ? PAPER : INK;
    if (r.w > fs * (p.ticker.length * 0.7 + 1) && r.h > fs * 1.6) {
      parts.push(`<text x="${x + fs * 0.5}" y="${y + fs * 1.25}" font-family="Inter" font-weight="600" font-size="${fs}" fill="${ink}">${escape(p.ticker)}</text>`);
      const pct = `${Math.round((p.value / bookTotal) * 1000) / 10}%`;
      if (r.h > fs * 3.2 && p.value / bookTotal >= 0.001) parts.push(`<text x="${x + fs * 0.5}" y="${y + r.h - fs * 0.6}" font-family="Inter" font-weight="600" font-size="${fs * 1.1}" fill="${ink}" fill-opacity="${isLead ? 1 : 0.85}">${pct}</text>`);
      if (isLead && r.h > fs * 4) {
        const label = `${lead.activity === "sold" || lead.activity === "reduce" ? "−" : "+"}${formatMoney(lead.dollars)} this quarter`;
        // Fit the label to the tile rather than to the ticker's size, or it runs off the edge.
        const labelFs = Math.min(fs * 0.75, (r.w - fs) / (label.length * 0.52));
        if (labelFs >= 10) parts.push(`<text x="${x + fs * 0.5}" y="${y + fs * 1.25 + labelFs * 1.35}" font-family="Inter" font-size="${labelFs}" fill="${ink}" fill-opacity="0.9">${escape(label)}</text>`);
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>${parts.join("")}</svg>`;
  const fontsDir = path.join(process.cwd(), "scripts", "newsletter", "fonts");
  const conf = path.join(fontsDir, "fonts.conf");
  writeFileSync(conf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${fontsDir}</dir><cachedir>/tmp/fc-cache</cachedir></fontconfig>`);
  process.env.FONTCONFIG_FILE = conf;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outFile);
  return true;
}
