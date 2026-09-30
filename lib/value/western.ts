import { WESTERN_VENUES } from './config';
import type { Company } from './types';

const venues = new Set<string>(WESTERN_VENUES);
export function bestWesternListing(company: Pick<Company, 'id' | 'listings'>): string | null {
  const eligible = (company.listings ?? []).filter(id => venues.has(id.slice(id.lastIndexOf('.') + 1).toUpperCase())).sort();
  return eligible.find(id => id === company.id) ?? eligible.find(id => id.endsWith('.US')) ?? eligible[0] ?? null;
}

/** Budget priority: accessible companies, then size. Refresh age can break equal-cap ties. */
export function compareWesternPriority(a: Company, b: Company): number {
  return Number(bestWesternListing(b) !== null) - Number(bestWesternListing(a) !== null)
    || (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0);
}

const names: Record<string, string> = {
  TO:'Toronto', V:'TSX Venture', NEO:'Cboe Canada', LSE:'London', XETRA:'Xetra', F:'Frankfurt',
  PA:'Paris', AS:'Amsterdam', BR:'Brussels', MC:'Madrid', MI:'Milan', LS:'Lisbon', VI:'Vienna',
  IR:'Dublin', CO:'Copenhagen', ST:'Stockholm', HE:'Helsinki', OL:'Oslo', WAR:'Warsaw',
  SW:'SIX Swiss Exchange', AU:'ASX', NZ:'NZX',
};
export function westernTradingLabel(w: string | null | undefined, homeId: string, homeExchange?: string): string | null {
  if (!w) return null;
  const dot = w.lastIndexOf('.'), ticker = w.slice(0, dot), suffix = w.slice(dot + 1);
  const knownUS: Record<string,string> = {'INFY.US':'NYSE'};
  const venue = suffix === 'US'
    ? knownUS[w] ?? (w === homeId && homeExchange && homeExchange !== 'US' ? homeExchange : /^[A-Z]{4}[YF]$/.test(ticker) ? 'US OTC' : 'US markets')
    : names[suffix] ?? suffix;
  return `Buy as ${ticker} on ${venue}`;
}
