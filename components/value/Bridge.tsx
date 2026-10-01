import { earningsYieldAtMid } from '@/lib/value/presentation';
import { OwnerEarningsWaterfall } from './viz/OwnerEarningsWaterfall';
import type { Valuation } from "@/lib/value/types";
import { formatMetric, metricLabels, perShareMoney } from "@/lib/value/metric-labels";

export function Bridge({ valuation: v }: { valuation: Valuation }) {
  const money = (value: number) => formatMetric({ value, format: 'money', currency: v.currency });
  const count = (value: number) => formatMetric({ value, format: 'count' });
  const component = (pattern: RegExp) => v.bridge.find(row => pattern.test(row.label))?.value ?? null;
  const amount = (value: number | null) => value === null ? '' : money(value);
  const deduction = (pattern: RegExp) => { const value = component(pattern); return amount(value === null ? null : Math.abs(value)); };
  const pvFactor = component(/PV factor/i) ?? (v.normalized ? (v.perShare.mid * v.shares - v.netCash) / v.normalized : null);
  const rows = v.method === 'owner_earnings' ? [
    ['Net income', amount(component(/^net income$/i))],
    ['+ D&A', amount(component(/D&A/i))],
    ['− Maintenance capex', deduction(/maintenance capex/i)],
    ['− Stock compensation', deduction(/stock compensation/i)],
    ...(component(/estimated lease payments/i) !== null ? [['− Estimated lease payments', deduction(/estimated lease payments/i)]] : []),
    ['= Owner earnings (normalized)', money(v.normalized)],
    ['× Present value of 10 years + terminal', pvFactor === null ? '' : `${pvFactor.toFixed(2)}×`],
    [v.version === 2 ? '+ Excess cash (above operating reserve)' : '+ Net cash', money(v.netCash)],
    ['÷ Shares used for valuation', count(v.shares)],
  ] : v.method === 'nav' ? [
    ['Reported NAV per share', perShareMoney(v.normalized, v.currency)],
    ['Ten-year NAV and dividend return', formatMetric({value:v.navReturn?.cagr??null,format:'pct'})],
  ] : [
    ['Tangible book value per share', perShareMoney(v.normalized, v.currency)],
    ['Normalised return on tangible equity', formatMetric({ value: component(/normalized return on (tangible )?equity/i), format: 'pct' })],
    ['Justified price / book', formatMetric({ value: component(/justified price to book/i), format: 'x' })],
  ];
  rows.push(['= Per-share value (low / mid / high)', [v.perShare.low, v.perShare.mid, v.perShare.high].map(value => perShareMoney(value, v.currency)).join(' / ')]);
  return <section data-testid="valuation-bridge" className="border-t border-ink/20 py-6">
    <h2 className="mb-4 text-xl font-semibold">{v.method === 'nav' ? 'NAV valuation' : v.method === 'book_value' ? 'Book value bridge' : 'Owner earnings bridge'}</h2>
    <p className="mb-3 text-sm text-ink/60">Values in {v.currency}, except shares and rates.</p>
    <div className="flex flex-col"><div className="order-2 sm:order-1">{v.method === 'owner_earnings' && <OwnerEarningsWaterfall valuation={v} />}</div>
    <details open={v.method !== 'owner_earnings'} className="order-1 mb-4 text-sm sm:order-2"><summary className="mb-3 cursor-pointer text-ink/55">Show as table</summary>
    <table className="w-full table-fixed text-left text-sm"><caption className="sr-only">Valuation bridge in {v.currency}</caption><tbody>{rows.filter(([,value])=>value!=='').map(([label, value]) => <tr key={label} className="border-t border-ink/15"><th scope="row" className="w-1/2 py-2 pr-4 font-normal">{label}</th><td className="py-2 text-right tabular-nums">{value}</td></tr>)}</tbody></table></details></div>
    {v.capitalReturns && <dl className="text-sm"><dt>Return on capital incl. acquisitions</dt><dd>{formatMetric({value:v.capitalReturns.includingAcquisitions,format:'pct'})} · ten-year median; compounder minimum 15%</dd></dl>}
    {v.riskFlags?.length ? <ul className="mt-4 text-sm text-ink/70">{v.riskFlags.map(flag => <li key={flag}>{flag}</li>)}</ul> : null}
    <h3 className="mt-5 text-sm font-medium">Assumptions</h3>
    <ul className="mt-2 space-y-1 text-xs text-ink/60">{(v.method==='nav' ? ['discountRate'] as const : ['growth', 'discountRate', 'terminalGrowth', 'bondYield', 'equityBondYield'] as const).map(key => <li key={key} className="flex justify-between gap-4"><span>{key === 'equityBondYield' ? v.method === 'owner_earnings' ? 'Earnings yield at mid value' : 'Earnings / market cap' : metricLabels[key].label}</span><span>{formatMetric({ value: key === 'equityBondYield' && v.method === 'owner_earnings' ? earningsYieldAtMid(v) : v[key], format: 'pct' })}</span></li>)}</ul>
    <ul className="mt-3 space-y-1 text-xs text-ink/60">{v.assumptions.map((assumption, i) => <li key={i}>{assumption}</li>)}</ul>
  </section>;
}
