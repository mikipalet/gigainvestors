import type { Analysis, Dossier } from './types';

// Operational evidence belongs in the private corpus, never in public JSON or RSC.
const privateWording = /verif(?:y|ied|ication)|\bchecking\b|being checked|share sources disagree|share count (?:not )?corrected/i;
export function publicAnalysis<T extends Analysis>(analysis: T): T {
  const { dataQualityFlags, ...rest } = analysis;
  const unavailable = Boolean(dataQualityFlags?.length);
  return {
    ...rest,
    ...(unavailable ? { valuation: null, valuationReason: 'Valuation unavailable.', valueHistory: [], b: false } : {
      valuation: analysis.valuation ? { ...analysis.valuation, assumptions: analysis.valuation.assumptions.filter(s => !privateWording.test(s)) } : null,
      valuationReason: analysis.valuationReason && privateWording.test(analysis.valuationReason) ? 'Valuation unavailable.' : analysis.valuationReason,
    }),
    tests: Object.fromEntries(Object.entries(analysis.tests).map(([key, test]) => [key, {
      ...test, reasons: test.reasons.filter(s => !privateWording.test(s)),
    }])),
  } as T;
}
