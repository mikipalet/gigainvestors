import type { Result, TestKey } from "@/lib/value/types";

export const testLabels: Record<TestKey, string> = {
  understandable: "Understandable", moat: "Moat", economics: "Economics",
  management: "Management", accounting: "Accounting", price: "Price",
};
export const resultColors: Record<Result, string> = {
  pass: "text-buy", fail: "text-sell", unclear: "text-ink/40", na: "text-ink/20",
};

export function TestChips({ tests }: { tests: Array<{ key: TestKey; result: Result }> }) {
  return <div className="flex flex-wrap gap-2">{tests.map((test) => (
    <span key={test.key} className={`border border-current px-2 py-1 text-xs ${resultColors[test.result]}`}>
      {testLabels[test.key]}: {test.result}
    </span>
  ))}</div>;
}
