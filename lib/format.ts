export function formatMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  return `$${Math.round(n / 1e3)}K`;
}

export function formatDelta(now: number, before: number | undefined): string | null {
  if (!before || before <= 0) return null;
  const d = ((now - before) / before) * 100;
  if (Math.abs(d) < 0.05) return null;
  const r = Math.round(d * 10) / 10;
  const s = Math.abs(r).toFixed(Math.abs(r) < 10 ? 1 : 0);
  return `${d >= 0 ? "+" : "−"}${s}%`;
}

// A real position that rounds to 0.0% reads as an error, so say it is small instead.
export const formatPct = (p: number) => {
  if (p > 0 && p < 0.05) return "<0.1%";
  const r = Math.round(p * 10) / 10;
  return `${r.toFixed(r < 10 ? 1 : 0)}%`;
};

export function formatChange(change: number | null | undefined): string | null {
  if (change === null || change === undefined || !Number.isFinite(change)) return null;
  // dataroma reports a microscopic position ballooning as "+630555%": show it as a multiplier.
  if (change >= 1000) return `×${Math.round(1 + change / 100).toLocaleString("en-US")}`;
  const r = Math.round(Math.abs(change) * 10) / 10;
  const s = r.toFixed(r < 10 ? 1 : 0);
  return `${change >= 0 ? "+" : "−"}${s}%`;
}

// Text size that follows tile size, so a big tile reads big without a font ladder.
export const scaleFor = (w: number, h: number) => Math.max(13, Math.min(26, Math.sqrt(w * h) / 14));

// Trims to whole sentences under a limit, falling back to a word boundary, for meta descriptions.
export function firstSentences(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const sentence = cut.lastIndexOf(". ");
  if (sentence > limit * 0.5) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Same adaptive compact precision as the original portfolio totals. */
export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return 'Not reported';
  const magnitude=Math.abs(value);
  const [scale,suffix]=magnitude>=1e12?[1e12,'T'] as const:magnitude>=1e9?[1e9,'B'] as const:magnitude>=1e6?[1e6,'M'] as const:magnitude>=1e3?[1e3,'K'] as const:[1,''] as const;
  const scaled=value/scale;
  const digits=suffix==='T'?2:suffix==='K'?0:suffix?Math.abs(scaled)>=10?0:1:0;
  return scaled.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits})+suffix;
}

export function currencyAmount(number: string, currency = ''): string {
  return currency==='USD'?`$${number}`:currency?`${currency} ${number}`:number;
}

export function compactMoney(value: number, currency = ''): string {
  if (!Number.isFinite(value)) return 'Not reported';
  const number=Math.abs(value)<1000?value.toLocaleString('en-US',{minimumFractionDigits:value===0?0:2,maximumFractionDigits:2}):compactNumber(value);
  return currencyAmount(number,currency);
}

/** Financial rates retain tenths for comparisons; portfolio weights use formatPct. */
export const formatRate = (value: number) => `${(value*100).toFixed(1)}%`;
