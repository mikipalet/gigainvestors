import { T } from './config';
import { QUALITY_TESTS, type Analysis, type NumericOutcome, type TestOutcome } from './types';

// Seven annual periods establish history; each core metric also checks its own observations.
export function withTestHistory<Outcome extends NumericOutcome | TestOutcome>(test: Outcome, years: number): Outcome {
  const required = T.minYears;
  if (test.key === 'price' || years >= required) return test;
  return { ...test, numeric: 'unclear', ...('result' in test ? { result: 'unclear' } : {}),
    pending: false, insufficientHistory: years, reasons: [`Not tested: only ${years} years`] };
}

/** Also migrate cached analyses at publication, before indexes and counts derive. */
export function withAnalysisHistory<A extends Analysis>(analysis: A): A {
  const years = analysis.historyCoverage?.years ?? analysis.tests.understandable.metrics.historyYears;
  if (years == null) return analysis;
  return { ...analysis, tests: { ...analysis.tests, ...Object.fromEntries(
    QUALITY_TESTS.filter(key => key !== 'price').map(key => [key, withTestHistory(analysis.tests[key], years)]),
  ) } };
}
