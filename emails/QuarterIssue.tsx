import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { Facts } from "@/lib/newsletter/issue";
import type { Prose } from "@/lib/newsletter/write";
import { formatMoney } from "@/lib/format";
import { mentionedIn, type Person } from "@/lib/newsletter/mentions";

const SITE = "https://gigainvestors.com";
const ink = "#111111";
const paper = "#f4f2ec";
const font = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const hairline = "1px solid rgba(17,17,17,0.12)";

const kicker = { fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" as const, opacity: 0.5, margin: 0, fontFamily: font };
const prose = { fontSize: 16, lineHeight: "25px", margin: 0, fontFamily: font, color: ink };

export interface IssueProps {
  facts: Facts;
  prose: Prose;
  heroUrl?: string;
  people: Person[];
}

export function QuarterIssue({ facts, prose: text, heroUrl, people }: IssueProps) {
  const q = facts.quarter;
  const link = (path: string) => `${SITE}${path}?q=${encodeURIComponent(q)}`;
  const [leadPara, ...rest] = text.paragraphs;
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{`${facts.quarter}, in ${text.paragraphs.length} paragraphs: ${facts.filed} filings, ${formatMoney(facts.aggregate)} between them.`}</Preview>
      <Body style={{ margin: 0, background: paper, color: ink, fontFamily: font }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px 40px" }}>
          <Text style={{ ...kicker, marginBottom: 14 }}>
            {q} · {facts.filed} of {facts.active} filed · {formatMoney(facts.aggregate)}
          </Text>
          <Text style={{ fontSize: 32, lineHeight: "38px", fontWeight: 700, margin: "0 0 18px", fontFamily: font, letterSpacing: -0.4 }}>{text.headline}</Text>
          <Text style={{ ...prose, fontSize: 18, lineHeight: "28px" }}>{leadPara}</Text>

          {heroUrl && facts.lead && (
            <Section style={{ marginTop: 24 }}>
              <Link href={link(`/${facts.lead.code}`)}>
                <Img src={heroUrl} alt={`${facts.lead.person}'s book in ${q}, buys in green and sells in red`} width={552} style={{ width: "100%", display: "block", border: hairline }} />
              </Link>
              <Text style={{ ...kicker, marginTop: 8, textTransform: "none", letterSpacing: 0, fontSize: 12 }}>
                {facts.lead.person}&apos;s book at the end of {q}. Green bought, red sold.
              </Text>
            </Section>
          )}

          {rest.map((para, i) => {
            const faces = mentionedIn(para, people);
            return (
              <Section key={i} style={{ marginTop: 32 }}>
                {faces.length > 0 && (
                  <table cellPadding={0} cellSpacing={0} style={{ marginBottom: 8 }}>
                    <tr>
                      {faces.map((p) => (
                        <td key={p.slug} style={{ paddingRight: 6 }}>
                          <Link href={link(`/${p.code}`)}>
                            <Img src={`${SITE}/faces/png/${p.slug}.png`} width={48} height={60} alt={p.name} style={{ display: "block" }} />
                          </Link>
                        </td>
                      ))}
                    </tr>
                  </table>
                )}
                <Text style={prose}>{para}</Text>
              </Section>
            );
          })}

          <Section style={{ marginTop: 40 }}>
            <Link href={link("/")} style={{ display: "inline-block", background: ink, color: paper, padding: "12px 18px", borderRadius: 3, fontWeight: 600, fontSize: 14, textDecoration: "none", fontFamily: font }}>
              Open {q} on gigainvestors.com
            </Link>
          </Section>

          <Section style={{ marginTop: 40, paddingTop: 16, borderTop: hairline }}>
            <Text style={{ ...prose, fontSize: 12, lineHeight: "18px", opacity: 0.6 }}>
              13F filings via dataroma.com, positions as reported at quarter end. Not advice.{" "}
              <Link href={`${SITE}/newsletter`} style={{ color: ink, textDecoration: "underline" }}>
                Archive
              </Link>{" "}
              ·{" "}
              <Link href="https://gigainvestors.com/unsubscribe?u={{{RESEND_UNSUBSCRIBE_URL}}}" style={{ color: ink, textDecoration: "underline" }}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
