import Link from "next/link";
import { formatMoney, formatPct } from "@/lib/format";
import type { Index, InvestorData, StockData } from "@/lib/types";

// Server-rendered, screen-reader and crawler readable twin of each treemap.
// Visually hidden: the treemap is the visual; this is the same data as text.
const hidden = "sr-only";

export function HomeContent({ index }: { index: Index }) {
  const q = index.quarters[index.quarters.length - 1];
  const rows = [...index.investors].map((i) => ({ i, pt: i.series[i.series.length - 1] })).sort((a, b) => (b.pt?.total ?? 0) - (a.pt?.total ?? 0));
  return (
    <section className={hidden}>
      <h1>GigaInvestors</h1>
      <p>
        {index.investors.length} famous investors and every quarterly 13F move since {index.quarters[0]}. Portfolios drawn as treemaps sized by dollar value; green
        means buying, red means selling. Latest quarter: {q}. Data from quarterly 13F filings via dataroma.com.
      </p>
      <h2>Investors by portfolio value, {q}</h2>
      <ul>
        {rows.map(({ i, pt }) => (
          <li key={i.code}>
            <Link href={`/${i.code}`}>
              {i.person}, {i.firm}: {pt ? `${formatMoney(pt.total)} across ${pt.positions} positions` : "no 13F holdings on file this quarter"}
            </Link>
          </li>
        ))}
      </ul>
      <h2>About this site</h2>
      <p>
        <Link href="/about">About</Link> · <Link href="/contact">Contact</Link> · <Link href="/privacy">Privacy</Link> · <a href="/llms.txt">Agent guide</a> ·{" "}
        <a href="/sitemap.xml">Sitemap</a>
      </p>
    </section>
  );
}

export function InvestorContent({ data }: { data: InvestorData }) {
  const cur = data.quarters[data.quarters.length - 1];
  const live = cur.positions.filter((p) => p.activity !== "sold");
  return (
    <section className={hidden}>
      <h1>
        {data.person}, {data.firm}
      </h1>
      <p>
        Portfolio {formatMoney(cur.total)} across {live.length} positions as of {cur.q}; history from {data.quarters[0].q}. Source: quarterly 13F filings via
        dataroma.com.
      </p>
      <h2>Positions, {cur.q}</h2>
      <ul>
        {live.map((p) => (
          <li key={p.ticker}>
            <Link href={`/s/${encodeURIComponent(p.ticker)}`}>
              {p.ticker} {p.name}: {formatPct(p.pct)} of portfolio, {formatMoney(p.value)}, {p.activity}
              {p.change !== null ? ` ${p.change > 0 ? "+" : ""}${p.change}%` : ""}
            </Link>
          </li>
        ))}
      </ul>
      <h2>Portfolio value by quarter</h2>
      <ul>
        {data.quarters.map((qq) => (
          <li key={qq.q}>
            {qq.q}: {formatMoney(qq.total)}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StockContent({ stock, people }: { stock: StockData; people: Record<string, string> }) {
  const cur = stock.quarters[stock.quarters.length - 1];
  const live = cur.holders.filter((h) => h.activity !== "sold");
  const total = live.reduce((a, h) => a + h.value, 0);
  return (
    <section className={hidden}>
      <h1>
        {stock.ticker}, {stock.name}
      </h1>
      <p>
        Held by {live.length} tracked investors, {formatMoney(total)} in total, as of {cur.q}. Source: quarterly 13F filings via dataroma.com.
      </p>
      <h2>Holders, {cur.q}</h2>
      <ul>
        {cur.holders.map((h) => (
          <li key={h.code}>
            <Link href={`/${h.code}`}>
              {people[h.code] ?? h.code}: {formatMoney(h.value)}, {formatPct(h.pct)} of their portfolio, {h.activity}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
