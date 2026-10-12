import type { FunnelCounts, PublishedFunnel, StoreMeta } from './types';

/** The last quality gate: profit record from 3.8.0, accounting in earlier publications. */
export const qualityGate = (funnel: FunnelCounts) => funnel.gates.find(g=>g.key==='record') ?? funnel.gates.find(g=>g.key==='accounting');

export function storyFromFunnel(funnel: PublishedFunnel): NonNullable<StoreMeta['story']> {
  const qualityPasses = qualityGate(funnel)?.passing ?? 0;
  return { analysed:funnel.analysed, qualityPasses,
    qualityShare:funnel.analysed ? qualityPasses/funnel.analysed : 0,
    atBuy:funnel.gates.find(g=>g.key==='price')?.passing ?? 0,
    countriesCovered:Object.values(funnel.byCountry).filter(c=>c.analysed>0).length };
}
