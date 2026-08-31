import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { IssueData } from "@/lib/newsletter/derive";
import { formatChange, formatMoney } from "@/lib/format";

const SITE = "https://gigainvestors.com";
const ink = "#111111";
const paper = "#f4f2ec";
const buy = "#257a4a";
const sell = "#bf3b2b";
const font = "Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif";

const badge = (m: IssueData["moves"][number]) => {
  const label = m.activity === "new" ? "NEW" : m.activity === "sold" ? "SOLD" : formatChange(m.change) ?? (m.activity === "add" ? "+" : "−");
  const color = m.activity === "new" || m.activity === "add" ? buy : sell;
  const solid = m.activity === "new" || m.activity === "sold";
  return (
    <span style={{ display: "inline-block", padding: "3px 6px", borderRadius: 2, fontSize: 12, fontWeight: 600, color: solid ? paper : color, background: solid ? color : paper, border: `1px solid ${color}`, fontFamily: font }}>
      {label}
    </span>
  );
};

export function QuarterIssue({ issue, treemapUrl }: { issue: IssueData; treemapUrl?: string }) {
  const q = issue.quarter;
  const scrub = `${SITE}/?q=${encodeURIComponent(q)}`;
  return (
    <Html lang="en">
      <Head />
      <Preview>{issue.headline}</Preview>
      <Body style={{ margin: 0, background: paper, color: ink, fontFamily: font }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px 32px" }}>
          <Text style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", opacity: 0.5, margin: 0 }}>GigaInvestors · {q}</Text>
          <Text style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, margin: "8px 0 4px" }}>{issue.headline}</Text>
          <Text style={{ fontSize: 14, opacity: 0.6, margin: "0 0 20px" }}>
            {issue.filed} of {issue.total} gigainvestors have filed for {q}. {formatMoney(issue.aggregate)} reported in total.
          </Text>

          {treemapUrl && (
            <Link href={scrub}>
              <Img src={treemapUrl} alt={`All gigainvestors, ${q}`} width={552} style={{ width: "100%", border: `1px solid rgba(17,17,17,0.15)` }} />
            </Link>
          )}

          <Section style={{ marginTop: 28 }}>
            <Text style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", opacity: 0.5, margin: "0 0 8px" }}>Biggest moves</Text>
            {issue.moves.map((m) => (
              <table key={`${m.code}-${m.ticker}`} width="100%" cellPadding={0} cellSpacing={0} style={{ borderTop: "1px solid rgba(17,17,17,0.12)" }}>
                <tr>
                  <td width={56} style={{ padding: "10px 0" }}>
                    <Img src={`${SITE}/faces/png/${m.slug}.png`} width={48} height={60} alt="" style={{ display: "block" }} />
                  </td>
                  <td style={{ padding: "10px 8px", verticalAlign: "middle" }}>
                    <Link href={`${SITE}/${m.code}?q=${encodeURIComponent(q)}`} style={{ color: ink, textDecoration: "none", fontWeight: 600, fontSize: 15 }}>
                      {m.person}
                    </Link>
                    <br />
                    <Link href={`${SITE}/s/${encodeURIComponent(m.ticker)}?q=${encodeURIComponent(q)}`} style={{ color: ink, textDecoration: "none", fontSize: 13, opacity: 0.7 }}>
                      {m.ticker} · {m.name}
                    </Link>
                  </td>
                  <td align="right" style={{ padding: "10px 0", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                    {badge(m)}
                    <br />
                    <span style={{ fontSize: 12, opacity: 0.6 }}>{formatMoney(m.dollars)}</span>
                  </td>
                </tr>
              </table>
            ))}
          </Section>

          <Section style={{ marginTop: 28 }}>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tr>
                {[
                  ["Most bought", issue.bought, buy],
                  ["Most sold", issue.sold, sell],
                ].map(([title, rows, color]) => (
                  <td key={String(title)} width="50%" style={{ verticalAlign: "top", paddingRight: 12 }}>
                    <Text style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: String(color), margin: "0 0 6px" }}>{String(title)}</Text>
                    {(rows as IssueData["bought"]).map((r) => (
                      <div key={r.ticker} style={{ fontSize: 13, padding: "3px 0", borderTop: "1px solid rgba(17,17,17,0.08)" }}>
                        <Link href={`${SITE}/s/${encodeURIComponent(r.ticker)}?q=${encodeURIComponent(q)}`} style={{ color: ink, textDecoration: "none", fontWeight: 600 }}>
                          {r.ticker}
                        </Link>
                        <span style={{ opacity: 0.6 }}> · {r.count}</span>
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            </table>
          </Section>

          {(issue.entrants.length > 0 || issue.exits.length > 0) && (
            <Section style={{ marginTop: 28 }}>
              <Text style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", opacity: 0.5, margin: "0 0 6px" }}>New and gone</Text>
              {issue.entrants.map((e) => (
                <Text key={`n${e.code}${e.ticker}`} style={{ fontSize: 13, margin: "2px 0" }}>
                  <span style={{ color: buy, fontWeight: 600 }}>new</span> {e.person} · {e.ticker} · {formatMoney(e.value)}
                </Text>
              ))}
              {issue.exits.map((e) => (
                <Text key={`x${e.code}${e.ticker}`} style={{ fontSize: 13, margin: "2px 0" }}>
                  <span style={{ color: sell, fontWeight: 600 }}>gone</span> {e.person} · {e.ticker} · {formatMoney(e.value)}
                </Text>
              ))}
            </Section>
          )}

          <Section style={{ marginTop: 32 }}>
            <Link href={scrub} style={{ display: "inline-block", background: ink, color: paper, padding: "10px 16px", borderRadius: 3, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
              Open {q} on gigainvestors.com
            </Link>
          </Section>

          <Text style={{ fontSize: 11, opacity: 0.45, marginTop: 40, lineHeight: 1.5 }}>
            Quarterly 13F filings via dataroma.com. Reported values, not advice. <Link href={`${SITE}/newsletter`} style={{ color: ink }}>Archive</Link> ·{" "}
            <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}" style={{ color: ink }}>Unsubscribe</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
