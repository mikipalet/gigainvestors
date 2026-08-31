import Link from "next/link";
import { NewsletterClient } from "./NewsletterClient";
import { listIssues } from "@/lib/newsletter/store";

export const dynamic = "force-static";
export const metadata = {
  title: "The quarter, by email · GigaInvestors",
  description: "One email per quarter: what 83 famous investors just bought and sold, from their 13F filings. Open stats, no tracking on the site.",
  alternates: { canonical: "https://gigainvestors.com/newsletter" },
};

export default function Page() {
  const issues = listIssues();
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[640px] flex-col gap-8 px-6 py-16 text-[15px] leading-relaxed">
      <Link href="/" className="text-[12px] font-semibold tracking-wide opacity-45 hover:opacity-100">
        GigaInvestors
      </Link>
      <div>
        <h1 className="text-[26px] font-semibold leading-tight">The quarter, by email.</h1>
        <p className="mt-2 opacity-60">What 83 famous investors bought and sold last quarter, sent once the quarter&apos;s 13F filings are in. Four emails a year.</p>
      </div>
      <NewsletterClient issues={issues.map((i) => ({ quarter: i.quarter, slug: i.slug, headline: i.headline, sentAt: i.sentAt ?? null }))} />
      <nav className="mt-6 flex gap-4 text-[12px] opacity-50">
        <Link href="/about">about</Link>
        <Link href="/contact">contact</Link>
        <Link href="/privacy">privacy</Link>
      </nav>
    </main>
  );
}
