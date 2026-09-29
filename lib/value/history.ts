import { T } from "./config";
import { bvps, goodwillAndIntangibles, ratio } from "./metrics";
import { ownerEarningsSeries } from "./owner-earnings";
import { run as understandable } from "./tests/understandable";
import { valueCompany } from "./valuation";
import type { CompanyEvent, Fundamentals, Kind, Series, ValueHistory, Volatility } from "./types";

export function earningsVolatility({ opMarginCv, commodity = false }: { opMarginCv: number | null; commodity?: boolean }): Volatility {
  if (commodity || opMarginCv === null || !Number.isFinite(opMarginCv)) return "volatile";
  if (opMarginCv <= T.price.cvStable + Number.EPSILON) return "stable";
  return opMarginCv <= T.understandable.maxOpMarginCv + Number.EPSILON ? "moderate" : "volatile";
}

export function valueHistory({ fundamentals, kind, bondYield, fxRate, commodity }: {
  fundamentals: Fundamentals; kind: Kind; bondYield: number | null; fxRate: number | null; commodity: boolean;
}): ValueHistory {
  if (!fundamentals.integrity.ok || bondYield === null || fxRate === null) return [];
  const years = [...fundamentals.years].sort((a, b) => a.fy - b.fy);
  const latest = years.at(-1)?.fy;
  if (latest === undefined) return [];
  return years.filter(year => year.fy > latest - T.history.years).flatMap(year => {
    const prefix = years.filter(y => y.fy <= year.fy);
    const cv = understandable({ years: prefix, kind }).metrics.opMarginCv;
    const { valuation } = valueCompany({ years: prefix, kind, currency: fundamentals.currency, bondYield,
      cyclical: commodity || cv !== null && earningsVolatility({ opMarginCv: cv }) === "volatile" });
    if (!valuation) return [];
    const { low, mid, high } = valuation.perShare;
    const row: ValueHistory[number] = [year.fy, low * fxRate, mid * fxRate, high * fxRate];
    return row.every(Number.isFinite) ? [row] : [];
  });
}

export function perShareSeries(fundamentals: Fundamentals): Record<string, Series> {
  const years = [...fundamentals.years].sort((a, b) => a.fy - b.fy);
  const earnings = new Map(ownerEarningsSeries(years));
  const perShare = (value: number | null, shares: number | null) => shares !== null && shares > 0 ? ratio(value, shares) : null;
  return {
    revenuePerShare: years.map(y => [y.fy, perShare(y.revenue, y.dilutedShares)]),
    ownerEarningsPerShare: years.map(y => [y.fy, perShare(earnings.get(y.fy) ?? null, y.dilutedShares)]),
    bookValuePerShare: years.map(y => [y.fy, y.dilutedShares !== null && y.dilutedShares > 0 ? bvps(y) : null]),
  };
}

export function companyEvents(fundamentals: Fundamentals): CompanyEvent[] {
  const events: CompanyEvent[] = [];
  for (const note of [...(fundamentals.integrity.notes ?? []), ...fundamentals.integrity.reasons]) {
    const fy = note.match(/\b(?:19|20)\d{2}\b/)?.[0];
    const kind = /share count/i.test(note) ? "share_change" : /currency chang/i.test(note) ? "currency_change" : null;
    if (fy && kind) events.push({ fy: Number(fy), kind, note: note.split(";")[0] });
  }
  const years = [...fundamentals.years].sort((a, b) => a.fy - b.fy);
  for (const [i, year] of years.entries()) {
    if (year.acquisitions !== null && year.totalAssets !== null && year.totalAssets > 0
      && year.acquisitions / year.totalAssets > T.history.acquisitionToAssets) {
      events.push({ fy: year.fy, kind: "acquisition", note: `${year.acquisitionsProxy ? "acquired goodwill and intangibles (proxy)" : "Acquisition spending"} was ${(100 * year.acquisitions / year.totalAssets).toFixed(1)}% of total assets` });
    }
    const previous = years[i - 1];
    if (!previous || previous.fy !== year.fy - 1) continue;
    const before = goodwillAndIntangibles(previous);
    const after = goodwillAndIntangibles(year);
    if (before === null || after === null) continue;
    if (before > 0 && (before - after) / before > T.history.impairmentDrop) {
      events.push({ fy: year.fy, kind: "impairment", note: `Goodwill and intangibles fell ${(100 * (before - after) / before).toFixed(1)}%; possible impairment or disposal` });
    }
  }
  return events.filter((event, index) => events.findIndex(other => other.fy === event.fy && other.kind === event.kind && other.note === event.note) === index)
    .sort((a, b) => a.fy - b.fy || a.kind.localeCompare(b.kind));
}
