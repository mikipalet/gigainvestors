export interface PriceRow {
  shares: number;
  value: number;
}

// Reported 13F prices are not split-adjusted: a 4:1 split reads as a 75% crash.
// A large price ratio mirrored by the inverse share-count ratio is a split, not a
// move; every price is rebased to the latest share basis via the cumulative factor.
export function adjustedPriceSeries(rows: (PriceRow | null)[]): (number | null)[] {
  const raw = rows.map((r) => (r && r.shares > 0 ? r.value / r.shares : null));
  const factors = new Array<number>(raw.length).fill(1);
  let cum = 1;
  let prevIdx = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === null) {
      factors[i] = cum;
      continue;
    }
    if (prevIdx >= 0) {
      const a = raw[prevIdx]!;
      const b = raw[i]!;
      const sa = rows[prevIdx]!.shares;
      const sb = rows[i]!.shares;
      const r = a / b;
      const s = sb / sa;
      if ((r >= 1.7 || r <= 1 / 1.7) && s >= r * 0.75 && s <= r * 1.35) cum *= r;
    }
    factors[i] = cum;
    prevIdx = i;
  }
  const last = factors[factors.length - 1] || 1;
  return raw.map((p, i) => (p === null ? null : (p * factors[i]) / last));
}
