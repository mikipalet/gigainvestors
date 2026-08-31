import { formatMoney, formatPct, plural } from "./format";
import type { Index, InvestorData, StockData } from "./types";

// Markdown representations served on Accept: text/markdown (acceptmarkdown.com).
const SITE = "https://gigainvestors.com";

export function homeMarkdown(index: Index): string {
  const q = index.quarters[index.quarters.length - 1];
  const rows = [...index.investors]
    .map((i) => ({ i, pt: i.series[i.series.length - 1] }))
    .sort((a, b) => (b.pt?.total ?? 0) - (a.pt?.total ?? 0));
  return [
    `# GigaInvestors`,
    ``,
    `${index.investors.length} famous investors, every quarterly 13F move since ${index.quarters[0]}. Latest quarter: ${q}.`,
    `Data: quarterly 13F filings via dataroma.com. Site: ${SITE}`,
    ``,
    `## Investors by portfolio value (${q})`,
    ``,
    `| Investor | Firm | Portfolio | Positions | Page |`,
    `|---|---|---:|---:|---|`,
    ...rows.map(({ i, pt }) => `| ${i.person} | ${i.firm} | ${pt ? formatMoney(pt.total) : "no holdings on file"} | ${pt?.positions ?? 0} | ${SITE}/${i.code} |`),
    ``,
    `## More`,
    `- Stock pages: ${SITE}/s/{TICKER} (who holds it, quarter by quarter)`,
    `- Sitemap: ${SITE}/sitemap.xml · Agent guide: ${SITE}/llms.txt`,
  ].join("\n");
}

export function investorMarkdown(d: InvestorData, holders: Record<string, number>): string {
  const cur = d.quarters[d.quarters.length - 1];
  const live = cur.positions.filter((p) => p.activity !== "sold");
  const moves = cur.positions.filter((p) => p.activity !== "hold");
  const label = (p: (typeof cur.positions)[number]) =>
    p.activity === "new" ? "new" : p.activity === "sold" ? "sold" : p.activity === "add" ? `+${p.change ?? 0}%` : p.activity === "reduce" ? `${p.change ?? 0}%` : "hold";
  return [
    `# ${d.person} — ${d.firm}`,
    ``,
    `Portfolio ${formatMoney(cur.total)} · ${live.length} positions · ${cur.q} · history from ${d.quarters[0].q}.`,
    `Source: quarterly 13F filings via dataroma.com. Page: ${SITE}/${d.code}`,
    ``,
    `## Positions (${cur.q})`,
    ``,
    `| Ticker | Company | % of portfolio | Value | This quarter | Holders |`,
    `|---|---|---:|---:|---|---:|`,
    ...live.map((p) => `| ${p.ticker} | ${p.name} | ${formatPct(p.pct)} | ${formatMoney(p.value)} | ${label(p)} | ${holders[p.ticker] ?? ""} |`),
    ``,
    `## Moves this quarter (${moves.length})`,
    ``,
    ...moves.map((p) => `- ${p.ticker} ${p.name}: ${label(p)} (${formatMoney(p.value)})`),
    ``,
    `## Portfolio value by quarter`,
    ``,
    ...d.quarters.map((qq) => `- ${qq.q}: ${formatMoney(qq.total)} (${qq.positions.filter((p) => p.activity !== "sold").length} positions)`),
  ].join("\n");
}

export function stockMarkdown(s: StockData, people: Record<string, string>): string {
  const cur = s.quarters[s.quarters.length - 1];
  const live = cur.holders.filter((h) => h.activity !== "sold");
  const total = live.reduce((a, h) => a + h.value, 0);
  return [
    `# ${s.ticker} — ${s.name}`,
    ``,
    `Held by ${plural(live.length, "investor")} · ${formatMoney(total)} total · ${cur.q}${cur.price ? ` · reported price $${cur.price.toFixed(2)} (split-adjusted)` : ""}.`,
    `Page: ${SITE}/s/${s.ticker}`,
    ``,
    `## Holders (${cur.q})`,
    ``,
    `| Investor | Value | % of their portfolio | This quarter |`,
    `|---|---:|---:|---|`,
    ...cur.holders.map((h) => `| ${people[h.code] ?? h.code} (${SITE}/${h.code}) | ${formatMoney(h.value)} | ${formatPct(h.pct)} | ${h.activity}${h.change !== null && h.change !== undefined ? ` ${h.change > 0 ? "+" : ""}${h.change}%` : ""} |`),
    ``,
    `## Total held by quarter`,
    ``,
    ...s.quarters.map((qq) => `- ${qq.q}: ${formatMoney(qq.holders.filter((h) => h.activity !== "sold").reduce((a, h) => a + h.value, 0))} · ${plural(qq.holders.filter((h) => h.activity !== "sold").length, "holder")}${qq.price ? ` · $${qq.price.toFixed(2)}` : ""}`),
  ].join("\n");
}

export const md = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept", "Cache-Control": "public, max-age=0, must-revalidate" },
  });
