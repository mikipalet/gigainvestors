import Link from "next/link";
import { notFound } from "next/navigation";
import { firstSentences } from "@/lib/format";
import { issueHero, listIssues, readIssue } from "@/lib/newsletter/store";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return listIssues().map((i) => ({ issue: i.slug }));
}

export async function generateMetadata(props: { params: Promise<{ issue: string }> }) {
  const { issue } = await props.params;
  const found = readIssue(issue);
  const url = `https://gigainvestors.com/newsletter/${issue}`;
  if (!found) return { title: "GigaInvestors", alternates: { canonical: url } };
  const { quarter, headline, prose } = found.manifest;
  const description = firstSentences(prose?.paragraphs[0] ?? `The ${quarter} letter from GigaInvestors.`, 200);
  const hero = issueHero(issue);
  const images = hero ? [{ url: hero, width: 1200, height: 640, alt: `${quarter}: ${headline}` }] : undefined;
  return {
    title: `${quarter}: ${headline}`,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, siteName: "GigaInvestors", title: headline, description, images },
    twitter: { card: "summary_large_image", title: headline, description, images: hero ? [hero] : undefined },
  };
}

const sentOn = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function Page(props: { params: Promise<{ issue: string }> }) {
  const { issue } = await props.params;
  const found = readIssue(issue);
  if (!found) notFound();
  const { manifest } = found;
  const prose = manifest.prose;
  const hero = issueHero(issue);

  // Issues written before the prose was stored on the manifest can only be shown as the email.
  if (!prose) {
    return (
      <main className="min-h-[100dvh]">
        <div className="mx-auto flex max-w-[640px] items-baseline justify-between px-6 pt-6 text-[12px]">
          <Link href="/newsletter" className="font-semibold tracking-wide opacity-45 hover:opacity-100">
            ← all issues
          </Link>
          <span className="opacity-45">{manifest.sentAt ? `sent ${sentOn(manifest.sentAt)}` : "not sent"}</span>
        </div>
        <iframe title={manifest.subject} srcDoc={found.html} className="mx-auto block h-[calc(100dvh-60px)] w-full max-w-[680px] border-0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" />
      </main>
    );
  }

  const [lead, ...rest] = prose.paragraphs;
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[680px] flex-col gap-6 px-6 pb-28 pt-12 text-[16px] leading-relaxed">
      <div className="flex items-baseline justify-between text-[12px]">
        <Link href="/newsletter" className="font-semibold tracking-wide opacity-45 hover:opacity-100">
          ← all issues
        </Link>
        <span className="opacity-45">{manifest.sentAt ? `sent ${sentOn(manifest.sentAt)}` : "not sent yet"}</span>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[1.5px] opacity-50">{manifest.quarter}</p>
        <h1 className="mt-2 text-[30px] font-semibold leading-[1.15] tracking-[-0.4px] sm:text-[34px]">{prose.headline}</h1>
      </div>

      <p className="text-[18px] leading-[1.6]">{lead}</p>

      {hero && (
        <figure className="m-0">
          <img src={hero} width={1200} height={640} alt={`The lead investor's book at the end of ${manifest.quarter}, buys in green and sells in red`} className="h-auto w-full border border-ink/12" />
          <figcaption className="mt-2 text-[12px] opacity-50">Green bought, red sold, sized by position.</figcaption>
        </figure>
      )}

      {rest.map((p) => (
        <p key={p.slice(0, 40)}>{p}</p>
      ))}

      <div className="mt-4 border-t border-ink/15 pt-6">
        <p className="text-[15px] opacity-70">One letter a quarter, when the filings are in.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/newsletter" className="inline-block rounded-[3px] bg-ink px-4 py-2 text-[15px] font-semibold text-paper transition-opacity hover:opacity-80">
            subscribe
          </Link>
          <Link href={`/?q=${encodeURIComponent(manifest.quarter)}`} className="inline-block rounded-[3px] px-4 py-2 text-[15px] shadow-[inset_0_0_0_1.5px_var(--ink)] transition-opacity hover:opacity-70">
            open {manifest.quarter} on the map
          </Link>
        </div>
        <p className="mt-4 text-[12px] opacity-45">
          13F filings via dataroma.com, positions as reported at quarter end. Not advice.{" "}
          <a href={`/newsletter/${issue}.html`} className="underline">
            Read it as the email
          </a>
          .
        </p>
      </div>
    </main>
  );
}
