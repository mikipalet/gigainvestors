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

const kicker = { fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" as const, opacity: 0.5, margin: "0 0 12px", fontFamily: font };
const prose = { fontSize: 16, lineHeight: "24px", margin: 0, fontFamily: font, color: ink };
const small = { fontSize: 13, lineHeight: "20px", margin: 0, fontFamily: font, color: ink };
const section = { marginTop: 40 };

const pts = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n))}%`;
const lastName = (p: string) => p.split(" ").pop() ?? p;

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

export function QuarterIssue({ issue, heroUrl }: { issue: Issue; heroUrl?: string }) {
  const q = issue.quarter;
  const link = (path: string) => `${SITE}${path}?q=${encodeURIComponent(q)}`;
  const lead = issue.lead;
  const notes = [
    ...issue.absentees.map((a) => `${lastName(a.person)} last filed for ${a.last}.`),
    ...issue.guards,
    `Next filings are due ${issue.nextDeadline}.`,
  ];
  return (
    <Html lang="en">
      <Head />
      <Preview>{issue.preview}</Preview>
      <Body style={{ margin: 0, background: paper, color: ink, fontFamily: font }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px 40px" }}>
          <Text style={kicker}>
            {q} · {issue.filed} filed · {formatMoney(issue.aggregate)}
          </Text>
          <Text style={{ fontSize: 30, lineHeight: "36px", fontWeight: 700, margin: "0 0 16px", fontFamily: font, letterSpacing: -0.3 }}>{issue.headline}</Text>
          <Text style={prose}>{issue.standfirst}</Text>

          {heroUrl && lead && (
            <Link href={link(`/s/${encodeURIComponent(lead.ticker)}`)}>
              <Img src={heroUrl} alt={`${lead.person} and the investors who bought or sold ${lead.ticker} in ${q}`} width={552} style={{ width: "100%", display: "block", marginTop: 24 }} />
            </Link>
          )}

          {issue.bets.length > 0 && (
            <Section style={section}>
              <Text style={kicker}>Five moves</Text>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                {issue.bets.map((m) => (
                  <tr key={`${m.code}-${m.ticker}`}>
                    <td width={32} style={{ padding: "8px 0", borderTop: hairline }}>
                      <Img src={`${SITE}/faces/png/${m.slug}.png`} width={26} height={32} alt="" style={{ display: "block" }} />
                    </td>
                    <td style={{ padding: "8px 10px", borderTop: hairline, fontSize: 14, fontFamily: font, whiteSpace: "nowrap" }}>
                      <Link href={link(`/${m.code}`)} style={{ color: ink, textDecoration: "none" }}>
                        {lastName(m.person)}
                      </Link>
                    </td>
                    <td style={{ padding: "8px 10px", borderTop: hairline, fontSize: 14, fontWeight: 700, fontFamily: font }}>
                      <Link href={link(`/s/${encodeURIComponent(m.ticker)}`)} style={{ color: ink, textDecoration: "none" }}>
                        {m.ticker}
                      </Link>
                    </td>
                    <td style={{ padding: "8px 10px", borderTop: hairline }}>
                      <Badge m={m} />
                    </td>
                    <td align="right" style={{ padding: "8px 0", borderTop: hairline, fontSize: 13, fontFamily: font, opacity: 0.6, whiteSpace: "nowrap" }}>
                      {pts(m.impact)} pts of the book · {formatMoney(m.dollars)}
                    </td>
                  </tr>
                ))}
              </table>
            </Section>
          )}

          {issue.agreed.length > 0 && (
            <Section style={section}>
              <Text style={kicker}>Agreed</Text>
              {issue.agreed.map((c) => {
                const buying = c.buyers.length > 0;
                const names = buying ? c.buyers : c.sellers;
                return (
                  <Text key={c.ticker} style={{ ...prose, fontSize: 15, lineHeight: "22px", margin: "0 0 8px" }}>
                    <Link href={link(`/s/${encodeURIComponent(c.ticker)}`)} style={{ color: ink, fontWeight: 700, textDecoration: "none" }}>
                      {c.ticker}
                    </Link>{" "}
                    <span style={{ color: buying ? buy : sell }}>
                      {names.length} {buying ? "bought" : "sold"}, none {buying ? "sold" : "bought"}
                    </span>
                    {c.priceMove !== null && <span style={{ opacity: 0.6 }}>, {signed(c.priceMove)} in the quarter</span>}
                    <br />
                    <span style={{ opacity: 0.6, fontSize: 13 }}>{names.join(", ")}</span>
                  </Text>
                );
              })}
            </Section>
          )}

          <Section style={section}>
            <Link href={link("/")} style={{ display: "inline-block", background: ink, color: paper, padding: "12px 18px", borderRadius: 3, fontWeight: 600, fontSize: 14, textDecoration: "none", fontFamily: font }}>
              Open {q} on gigainvestors.com
            </Link>
          </Section>

          <Section style={{ marginTop: 40, paddingTop: 16, borderTop: hairline }}>
            <Text style={{ ...small, opacity: 0.6 }}>{notes.join(" ")}</Text>
            <Text style={{ ...small, fontSize: 11, opacity: 0.45, marginTop: 16 }}>
              13F filings via dataroma.com, positions as reported at quarter end. Not advice.{" "}
              <Link href={`${SITE}/newsletter`} style={{ color: ink }}>
                Archive
              </Link>{" "}
              ·{" "}
              <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}" style={{ color: ink }}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
