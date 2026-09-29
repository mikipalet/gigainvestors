import { OwnerEarningsWaterfall } from './viz/OwnerEarningsWaterfall';
import type { Valuation } from "@/lib/value/types";
import { formatMetric, metricLabels, perShareMoney } from "@/lib/value/metric-labels";

export function Bridge({ valuation: v }: { valuation: Valuation }) {
  const money = (value: number) => formatMetric({ value, format: 'money', currency: v.currency });
  const count = (value: number) => formatMetric({ value, format: 'count' });
  const component = (pattern: RegExp) => v.bridge.find(row => pattern.test(row.label))?.value ?? null;
  const amount = (value: number | null) => value === null ? 'Not reported' : money(value);
  const deduction = (pattern: RegExp) => { const value = component(pattern); return amount(value === null ? null : Math.abs(value)); };
  const pvFactor = component(/PV factor/i) ?? (v.normalized ? (v.perShare.mid * v.shares - v.netCash) / v.normalized : null);
  const rows = v.method === 'owner_earnings' ? [
    ['Net income', amount(component(/^net income$/i))],
    ['+ D&A', amount(component(/D&A/i))],
    ['− Maintenance capex', deduction(/maintenance capex/i)],
    ['− Stock compensation', deduction(/stock compensation/i)],
    ['= Owner earnings (normalized)', money(v.normalized)],
    ['× Present value of 10 years + terminal', pvFactor === null ? 'Not reported' : `${pvFactor.toFixed(2)}×`],
    ['+ Net cash', money(v.netCash)],
    ['÷ Diluted shares', count(v.shares)],
  ] : [
    ['Book value per share', perShareMoney(v.normalized, v.currency)],
    ['Normalized return on equity', formatMetric({ value: component(/normalized return on equity/i), format: 'pct' })],
    ['Justified price / book', formatMetric({ value: component(/justified price to book/i), format: 'x' })],
  ];
  rows.push(['= Per-share value (low / mid / high)', [v.perShare.low, v.perShare.mid, v.perShare.high].map(value => perShareMoney(value, v.currency)).join(' / ')]);
  return <section data-testid="valuation-bridge" className="border-t border-ink/20 py-6">
    <h2 className="mb-4 text-xl font-semibold">{v.method === 'book_value' ? 'Book value bridge' : 'Owner earnings bridge'}</h2>
    <p className="mb-3 text-sm text-ink/60">Values in {v.currency}, except shares and rates.</p>
    <div className="flex flex-col"><div className="order-2 sm:order-1">{v.method === 'owner_earnings' && <OwnerEarningsWaterfall valuation={v} />}</div>
    <details open={v.method === 'book_value'} className="order-1 mb-4 text-sm sm:order-2"><summary className="mb-3 cursor-pointer text-ink/55">Show as table</summary>
    <table className="w-full table-fixed text-left text-sm"><caption className="sr-only">Valuation bridge in {v.currency}</caption><tbody>{rows.map(([label, value]) => <tr key={label} className="border-t border-ink/15"><th scope="row" className="w-1/2 py-2 pr-4 font-normal">{label}</th><td className="py-2 text-right tabular-nums">{value}</td></tr>)}</tbody></table></details></div>
    <h3 className="mt-5 text-sm font-medium">Assumptions</h3>
    <ul className="mt-2 space-y-1 text-xs text-ink/60">{(['growth', 'discountRate', 'terminalGrowth', 'bondYield', 'equityBondYield'] as const).map(key => <li key={key} className="flex justify-between gap-4"><span>{metricLabels[key].label}</span><span>{formatMetric({ value: v[key], format: 'pct' })}</span></li>)}</ul>
    <ul className="mt-3 space-y-1 text-xs text-ink/60">{v.assumptions.map((assumption, i) => <li key={i}>{assumption}</li>)}</ul>
  </section>;
}
