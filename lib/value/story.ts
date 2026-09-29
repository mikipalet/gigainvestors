import type { PublishedFunnel, StoreMeta } from './types';

export function storyFromFunnel(funnel: PublishedFunnel): NonNullable<StoreMeta['story']> {
  const qualityPasses = funnel.gates.find(g=>g.key==='accounting')?.passing ?? 0;
  return { analysed:funnel.analysed, qualityPasses,
    qualityShare:funnel.analysed ? qualityPasses/funnel.analysed : 0,
    atBuy:funnel.gates.find(g=>g.key==='price')?.passing ?? 0,
    countriesCovered:Object.values(funnel.byCountry).filter(c=>c.analysed>0).length };
}
