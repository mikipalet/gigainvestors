import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { Issue, Move } from "@/lib/newsletter/issue";
import { formatChange, formatMoney } from "@/lib/format";

const SITE = "https://gigainvestors.com";
const ink = "#111111";
const paper = "#f4f2ec";
const buy = "#257a4a";
const sell = "#bf3b2b";
const font = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const hairline = "1px solid rgba(17,17,17,0.12)";

const kicker = { fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" as const, opacity: 0.5, margin: "0 0 10px", fontFamily: font };
const prose = { fontSize: 15, lineHeight: "22px", margin: "0 0 12px", fontFamily: font, color: ink };
const section = { marginTop: 36, paddingTop: 16, borderTop: hairline };

const pts = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n))}%`;

function Badge({ m }: { m: Move }) {
  const label = m.activity === "new" ? "NEW" : m.activity === "sold" ? "EXIT" : (formatChange(m.change) ?? (m.activity === "add" ? "+" : "−"));
  const color = m.activity === "new" || m.activity === "add" ? buy : sell;
  const solid = m.activity === "new" || m.activity === "sold";
  return (
    <span style={{ display: "inline-block", padding: "3px 6px", borderRadius: 2, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: solid ? paper : color, background: solid ? color : paper, border: `1px solid ${color}`, fontFamily: font, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function ConsensusRow({ c, q }: { c: Issue["agreedBuys"][number]; q: string }) {
  const dir = c.buyers.length ? buy : sell;
  const names = c.buyers.length ? c.buyers : c.sellers;
  return (
    <Text style={{ ...prose, fontSize: 13, lineHeight: "19px", margin: "0 0 8px" }}>
      <Link href={`${SITE}/s/${encodeURIComponent(c.ticker)}?q=${encodeURIComponent(q)}`} style={{ color: ink, fontWeight: 700, textDecoration: "none" }}>
        {c.ticker}
      </Link>
      <span style={{ color: dir, fontWeight: 600 }}> {c.buyers.length ? `${c.buyers.length} bought, 0 sold` : `${c.sellers.length} sold, 0 bought`}</span>
      {c.priceMove !== null && <span style={{ opacity: 0.6 }}> · price {signed(c.priceMove)}</span>}
      {c.holdersNow !== c.holdersBefore && <span style={{ opacity: 0.6 }}> · holders {c.holdersBefore} → {c.holdersNow}</span>}
      <br />
      <span style={{ opacity: 0.7 }}>{names.join(", ")}</span>
    </Text>
  );
}

export function QuarterIssue({ issue, heroUrl }: { issue: Issue; heroUrl?: string }) {
  const q = issue.quarter;
  const scrub = `${SITE}/?q=${encodeURIComponent(q)}`;
  const lead = issue.lead;
  return (
    <Html lang="en">
      <Head />
      <Preview>{issue.preview}</Preview>
      <Body style={{ margin: 0, background: paper, color: ink, fontFamily: font }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px 32px" }}>
          <Text style={kicker}>
            GigaInvestors · {q} · {issue.filed} of {issue.active} active filed
          </Text>
          <Text style={{ fontSize: 28, lineHeight: "34px", fontWeight: 700, margin: "0 0 14px", fontFamily: font }}>{issue.headline}</Text>
          {issue.standfirst.map((s) => (
            <Text key={s.slice(0, 40)} style={{ ...prose, fontSize: 16, lineHeight: "24px" }}>
              {s}
            </Text>
          ))}

          {heroUrl && lead && (
            <Link href={`${SITE}/s/${encodeURIComponent(lead.ticker)}?q=${encodeURIComponent(q)}`}>
              <Img src={heroUrl} alt={`${lead.person} and the investors who bought or sold ${lead.ticker} in ${q}`} width={552} style={{ width: "100%", display: "block", marginTop: 12 }} />
            </Link>
          )}

          <Section style={section}>
            <Text style={kicker}>Roll call</Text>
            {issue.rollCall.map((r) => (
              <table key={r.code} width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 14 }}>
                <tr>
                  <td width={40} style={{ verticalAlign: "top", paddingTop: 2 }}>
                    <Img src={`${SITE}/faces/png/${r.slug}.png`} width={32} height={40} alt="" style={{ display: "block" }} />
                  </td>
                  <td style={{ verticalAlign: "top", paddingLeft: 10 }}>
                    <Text style={{ ...prose, margin: 0 }}>
                      <Link href={`${SITE}/${r.code}?q=${encodeURIComponent(q)}`} style={{ color: ink, fontWeight: 600, textDecoration: "none" }}>
                        {r.person}
                      </Link>{" "}
                      {r.sentences.join(" ")}
                    </Text>
                  </td>
                </tr>
              </table>
            ))}
          </Section>

          {issue.bets.length > 0 && (
            <Section style={section}>
              <Text style={kicker}>Biggest bets, in points of the investor&apos;s own book</Text>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                {issue.bets.map((m) => (
                  <tr key={`${m.code}-${m.ticker}`}>
                    <td width={30} style={{ padding: "6px 0", borderTop: hairline }}>
                      <Img src={`${SITE}/faces/png/${m.slug}.png`} width={24} height={30} alt="" style={{ display: "block" }} />
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: hairline, fontSize: 13, fontFamily: font }}>
                      <Link href={`${SITE}/${m.code}?q=${encodeURIComponent(q)}`} style={{ color: ink, textDecoration: "none" }}>
                        {m.person}
                      </Link>
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: hairline, fontSize: 13, fontWeight: 700, fontFamily: font }}>
                      <Link href={`${SITE}/s/${encodeURIComponent(m.ticker)}?q=${encodeURIComponent(q)}`} style={{ color: ink, textDecoration: "none" }}>
                        {m.ticker}
                      </Link>
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: hairline }}>
                      <Badge m={m} />
                    </td>
                    <td align="right" style={{ padding: "6px 8px", borderTop: hairline, fontSize: 13, fontFamily: font, whiteSpace: "nowrap" }}>
                      {pts(m.impact)} pts
                    </td>
                    <td align="right" style={{ padding: "6px 0", borderTop: hairline, fontSize: 13, fontFamily: font, opacity: 0.6, whiteSpace: "nowrap" }}>
                      {formatMoney(m.dollars)}
                    </td>
                  </tr>
                ))}
              </table>
            </Section>
          )}

          {(issue.agreedBuys.length > 0 || issue.agreedSells.length > 0) && (
            <Section style={section}>
              <Text style={kicker}>Where they agree</Text>
              {issue.agreedBuys.length > 0 && <Text style={{ ...prose, fontSize: 13, opacity: 0.6, margin: "0 0 6px" }}>Buys with no meaningful seller</Text>}
              {issue.agreedBuys.map((c) => (
                <ConsensusRow key={c.ticker} c={c} q={q} />
              ))}
              {issue.agreedSells.length > 0 && <Text style={{ ...prose, fontSize: 13, opacity: 0.6, margin: "12px 0 6px" }}>Sells with no meaningful buyer</Text>}
              {issue.agreedSells.map((c) => (
                <ConsensusRow key={c.ticker} c={c} q={q} />
              ))}
              {issue.contested.length > 0 && (
                <Text style={{ ...prose, fontSize: 13, lineHeight: "19px", marginTop: 12 }}>
                  Contested:{" "}
                  {issue.contested.map((c, i) => (
                    <span key={c.ticker}>
                      {i > 0 ? " · " : ""}
                      <b>{c.ticker}</b> {c.buyers.length} buyers against {c.sellers.length} sellers{c.priceMove !== null ? `, price ${signed(c.priceMove)}` : ""}
                    </span>
                  ))}
                  .
                </Text>
              )}
            </Section>
          )}

          {issue.crowd.length > 0 && (
            <Section style={section}>
              <Text style={kicker}>The crowd</Text>
              <Text style={{ ...prose, fontSize: 13, lineHeight: "20px" }}>
                {issue.crowd.map((c, i) => (
                  <span key={c.ticker}>
                    {i > 0 ? " · " : ""}
                    <Link href={`${SITE}/s/${encodeURIComponent(c.ticker)}?q=${encodeURIComponent(q)}`} style={{ color: ink, fontWeight: 600, textDecoration: "none" }}>
                      {c.ticker}
                    </Link>{" "}
                    <span style={{ color: c.now > c.before ? buy : sell }}>
                      {c.before} → {c.now}
                    </span>
                  </span>
                ))}
              </Text>
            </Section>
          )}

          {(issue.quiet.length > 0 || issue.loud.length > 0) && (
            <Section style={section}>
              <Text style={kicker}>Quiet, and loud</Text>
              {issue.quiet.length > 0 && <Text style={{ ...prose, fontSize: 13, lineHeight: "20px" }}>{issue.quiet.join(" ")}</Text>}
              {issue.loud.length > 0 && <Text style={{ ...prose, fontSize: 13, lineHeight: "20px" }}>Loudest: {issue.loud.join(" ")}</Text>}
            </Section>
          )}

          <Section style={section}>
            <Text style={kicker}>Not in this filing</Text>
            {issue.absentees.map((a) => (
              <Text key={a.person} style={{ ...prose, fontSize: 13, lineHeight: "20px" }}>
                {a.person} last filed for {a.last}.
              </Text>
            ))}
            {issue.guards.map((g) => (
              <Text key={g.slice(0, 30)} style={{ ...prose, fontSize: 13, lineHeight: "20px" }}>
                {g}
              </Text>
            ))}
            <Text style={{ ...prose, fontSize: 13, lineHeight: "20px" }}>Positions are as reported at quarter end, published up to 45 days later. No cost basis, no returns, no cash, no shorts, no non-US listings.</Text>
            <Text style={{ ...prose, fontSize: 13, lineHeight: "20px" }}>
              The {issue.filed} reported {formatMoney(issue.aggregate)}{issue.aggregateBefore > 0 ? `, ${signed(((issue.aggregate - issue.aggregateBefore) / issue.aggregateBefore) * 100)} from ${formatMoney(issue.aggregateBefore)} a quarter earlier` : ""}. Next filings are due {issue.nextDeadline}.
            </Text>
          </Section>

          <Section style={{ marginTop: 28 }}>
            <Link href={scrub} style={{ display: "inline-block", background: ink, color: paper, padding: "10px 16px", borderRadius: 3, fontWeight: 600, fontSize: 14, textDecoration: "none", fontFamily: font }}>
              Open {q} on gigainvestors.com
            </Link>
          </Section>

          <Text style={{ fontSize: 11, opacity: 0.45, marginTop: 36, lineHeight: "16px", fontFamily: font }}>
            Quarterly 13F filings via dataroma.com. Reported values, not advice.{" "}
            <Link href={`${SITE}/newsletter`} style={{ color: ink }}>
              Archive
            </Link>{" "}
            ·{" "}
            <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}" style={{ color: ink }}>
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
