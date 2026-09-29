import { StatusGlyph } from './viz/StatusGlyph';
import type { Result, TestKey } from "@/lib/value/types";

export const testLabels: Record<TestKey, string> = {
  understandable: "Understandable", moat: "Moat", economics: "Economics",
  management: "Management", accounting: "Accounting", price: "Price",
};
export function TestChips({ tests }: { tests: Array<{ key: TestKey; result: Result }> }) {
  return <div className="flex flex-wrap gap-2">{tests.map((test) => (
    <span key={test.key} className="flex items-center gap-2 border border-ink/20 px-2 py-1 text-xs">
      <StatusGlyph result={test.result} label={`${testLabels[test.key]}: ${test.result}`} />{testLabels[test.key]}: {test.result === 'na' ? 'n/a' : test.result}
    </span>
  ))}</div>;
}
