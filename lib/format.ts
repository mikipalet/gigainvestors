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
  const s = d.toFixed(Math.abs(d) < 10 ? 1 : 0);
  return `${d >= 0 ? "+" : "−"}${s.replace("-", "")}%`;
}

export const formatPct = (p: number) => `${p.toFixed(p < 10 ? 1 : 0)}%`;

export function formatChange(change: number | null): string | null {
  if (change === null) return null;
  const s = Math.abs(change).toFixed(Math.abs(change) < 10 ? 1 : 0);
  return `${change >= 0 ? "+" : "−"}${s}%`;
}

// Text size that follows tile size, so a big tile reads big without a font ladder.
export const scaleFor = (w: number, h: number) => Math.max(11, Math.min(26, Math.sqrt(w * h) / 14));
