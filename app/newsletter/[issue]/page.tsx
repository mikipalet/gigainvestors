import Link from "next/link";
import { notFound } from "next/navigation";
import { issueHero, listIssues, readIssue } from "@/lib/newsletter/store";
import { firstSentences } from "@/lib/format";

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

export default async function Page(props: { params: Promise<{ issue: string }> }) {
  const { issue } = await props.params;
  const found = readIssue(issue);
  if (!found) notFound();
  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto flex max-w-[640px] items-baseline justify-between px-6 pt-6 text-[12px]">
        <Link href="/newsletter" className="font-semibold tracking-wide opacity-45 hover:opacity-100">
          ← all issues
        </Link>
        <span className="opacity-45">{found.manifest.sentAt ? `sent ${new Date(found.manifest.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "preview"}</span>
      </div>
      <iframe title={found.manifest.subject} srcDoc={found.html} className="mx-auto block h-[calc(100dvh-60px)] w-full max-w-[680px] border-0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" />
    </main>
  );
}
