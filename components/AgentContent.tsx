import Link from "next/link";
import { formatPct } from "@/lib/format";
import type { Index, InvestorData, StockData } from "@/lib/types";

// Server-rendered, screen-reader and crawler readable twin of each treemap.
// Visually hidden: the treemap is the visual; this is the same data as text.
const hidden = "sr-only";
const usd=(n:number)=>`USD ${new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n)}`;

export function HomeContent({ index, quarter }: { index: Index; quarter?:string }) {
  const q = quarter??index.quarters[index.quarters.length - 1];
  const rows = [...index.investors].map((i) => ({ i, pt: i.series.find(point=>point.q===q) })).sort((a, b) => (b.pt?.total ?? 0) - (a.pt?.total ?? 0));
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
              {i.person}, {i.firm}: {pt ? `${usd(pt.total)} across ${pt.positions} positions` : "no 13F holdings on file this quarter"}
            </Link>
          </li>
        ))}
      </ul>
      <h2>About this site</h2>
      <p>
        <Link href="/about">About</Link> · <Link href="/privacy">Privacy</Link> · <a href="/llms.txt">Agent guide</a> ·{" "}
        <a href="/sitemap.xml">Sitemap</a>
      </p>
    </section>
  );
}

export function InvestorContent({ data, quarter }: { data: InvestorData; quarter?:string }) {
  const cur = data.quarters.find(row=>row.q===quarter)??data.quarters[data.quarters.length - 1];
  const live = cur.positions.filter((p) => p.activity !== "sold");
  return (
    <section className={hidden}>
      <h1>
        {data.person}, {data.firm}
      </h1>
      <p>
        Portfolio {usd(cur.total)} across {live.length} positions as of {cur.q}; history from {data.quarters[0].q}. Source: quarterly 13F filings via
        dataroma.com.
      </p>
      <h2>Positions, {cur.q}</h2>
      <ul>
        {live.map((p) => (
          <li key={p.ticker}>
            <Link href={`/s/${encodeURIComponent(p.ticker)}`}>
              {p.ticker} {p.name}: {formatPct(p.pct)} of portfolio, {usd(p.value)}, {p.activity}
              {p.change !== null ? ` ${p.change > 0 ? "+" : ""}${p.change}%` : ""}
            </Link>
          </li>
        ))}
      </ul>
      <h2>Portfolio value, all published quarters</h2>
      <ul>
        {data.quarters.map((qq) => (
          <li key={qq.q}>
            {qq.q}: {usd(qq.total)}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StockContent({ stock, people, quarter }: { stock: StockData; people: Record<string, string>; quarter?:string }) {
  const cur = stock.quarters.find(row=>row.q===quarter)??stock.quarters[stock.quarters.length - 1];
  const live = cur.holders.filter((h) => h.activity !== "sold");
  const total = live.reduce((a, h) => a + h.value, 0);
  return (
    <section className={hidden}>
      <h1>
        {stock.ticker}, {stock.name}
      </h1>
      <p>
        Held by {live.length} tracked investors, {usd(total)} in total, as of {cur.q}. Source: quarterly 13F filings via dataroma.com.
      </p>
      <h2>Holders, {cur.q}</h2>
      <ul>
        {cur.holders.map((h) => (
          <li key={h.code}>
            <Link href={`/${h.code}`}>
              {people[h.code] ?? h.code}: {usd(h.value)}, {formatPct(h.pct)} of their portfolio, {h.activity}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
