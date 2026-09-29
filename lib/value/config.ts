export const T = {
  minYears: 7,
  understandable: { years: 10, maxRevenueDeclines: 3, maxLossYears: 2, maxOpMarginCv: 0.35 },
  moat: { badYearsAllowed: 1, roicMedian: 0.15, roicWorst3: 0.10, gmDropPp: 0.02, roeMedianFin: 0.12, roeWorst3Fin: 0.08 },
  economics: { oeToNi: 0.8, roiic: 0.12 },
  management: { maxShareCagr: 0.01 },
  accounting: { maxAccruals: 0.10, maxRecvGap: 0.10, maxRestructYears: 2, maxSbcToOcf: 0.15 },
  price: { passMos: 0.25 },
  valuation: { minDiscount: 0.10, bondSpread: 0.04, maxGrowth: 0.12, terminal: 0.03, finMaxGrowth: 0.06 },
  jev: { contradict: 0.7, trustAgreement: 0.85, evidence: 0.6, chunkTokens: 24_000, minParagraphChars: 200 },
} as const;
