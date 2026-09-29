import type { Valuation } from "@/lib/value/types";

export function Bridge({ valuation }: { valuation: Valuation }) {
  const number = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const rows = [
    ...valuation.bridge.map((row) => ({ label: row.label, value: number(row.value) })),
    { label: valuation.method === "book_value" ? "Normalized book value per share" : "Normalized owner earnings", value: number(valuation.normalized) },
    { label: "Growth", value: percent(valuation.growth) },
    { label: "Discount rate", value: percent(valuation.discountRate) },
    { label: "Terminal growth", value: percent(valuation.terminalGrowth) },
    { label: "Equity bond yield", value: valuation.equityBondYield === null ? "Not available" : percent(valuation.equityBondYield) },
    { label: "Government bond yield", value: valuation.bondYield === null ? "Not available" : percent(valuation.bondYield) },
    { label: "Net cash", value: number(valuation.netCash) },
    { label: "Diluted shares", value: number(valuation.shares) },
    { label: "Per-share value", value: `${valuation.currency} ${number(valuation.perShare.mid)}` },
  ];
  return <section data-testid="valuation-bridge" className="border-t border-ink/20 py-6">
    <h2 className="mb-4 text-xl font-semibold">{valuation.method === "book_value" ? "Book value bridge" : "Owner earnings bridge"}</h2>
    <p className="mb-3 text-sm text-ink/60">Values in {valuation.currency}, except shares and rates.</p>
    <dl>{rows.map((row, i) => <div key={`${row.label}-${i}`} className="flex justify-between gap-6 border-t border-ink/15 py-2 text-sm"><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
    <ul className="mt-4 space-y-2 text-sm text-ink/60">{valuation.assumptions.map((assumption, i) => <li key={i}>{assumption}</li>)}</ul>
  </section>;
}
