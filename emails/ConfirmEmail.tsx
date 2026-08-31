import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "@react-email/components";

const SITE = "https://gigainvestors.com";
const ink = "#111111";
const paper = "#f4f2ec";
const font = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const hairline = "1px solid rgba(17,17,17,0.12)";

const FACES = ["warren-buffett", "bill-ackman", "li-lu", "seth-klarman", "terry-smith", "david-tepper", "charlie-munger"];

export function ConfirmEmail({ confirmUrl }: { confirmUrl: string }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>One click to confirm, then one email a quarter.</Preview>
      <Body style={{ margin: 0, background: paper, color: ink, fontFamily: font }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "48px 24px 40px" }}>
          <Text style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.5, margin: "0 0 20px", fontFamily: font }}>GigaInvestors</Text>

          <table cellPadding={0} cellSpacing={0} width="100%" style={{ marginBottom: 24 }}>
            <tr>
              {FACES.map((slug) => (
                <td key={slug} align="center" style={{ paddingRight: 4 }}>
                  <Img src={`${SITE}/faces/png/${slug}.png`} width={56} height={70} alt="" style={{ display: "block" }} />
                </td>
              ))}
            </tr>
          </table>

          <Text style={{ fontSize: 26, lineHeight: "32px", fontWeight: 700, margin: "0 0 14px", fontFamily: font, letterSpacing: -0.3 }}>Confirm and you are in.</Text>
          <Text style={{ fontSize: 16, lineHeight: "24px", margin: "0 0 24px", fontFamily: font }}>
            Once a quarter, when the 13F filings are in, you get one letter on what 83 of the most followed investors bought and sold. Four a year, nothing in between.
          </Text>

          <Link href={confirmUrl} style={{ display: "inline-block", background: ink, color: paper, padding: "12px 20px", borderRadius: 3, fontWeight: 600, fontSize: 15, textDecoration: "none", fontFamily: font }}>
            Confirm subscription
          </Link>

          <Section style={{ marginTop: 36, paddingTop: 16, borderTop: hairline }}>
            <Text style={{ fontSize: 12, lineHeight: "18px", opacity: 0.5, margin: 0, fontFamily: font }}>
              The link works for 48 hours. If you did not ask for this, ignore it and nothing happens.{" "}
              <Link href={`${SITE}/newsletter`} style={{ color: ink, textDecoration: "underline" }}>
                Read the last issue
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
