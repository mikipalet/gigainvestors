import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://value.gigainvestors.com"),
  title: "Buffett checklist | GigaInvestors",
  description: "Six independent tests of business quality and price, with financial history and report evidence.",
  openGraph: { title: "Buffett checklist", url: "https://value.gigainvestors.com", siteName: "GigaInvestors Value" },
};

export default function ValueLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-10">
    <nav className="mb-10 flex justify-between gap-4 text-sm"><a href="/value">GigaInvestors · Value</a><a href="https://gigainvestors.com">Superinvestor portfolios ↗</a></nav>
    {children}
    <footer className="mt-10 border-t border-ink/20 pt-4 text-xs text-ink/60"><a href="https://gigainvestors.com/about">About GigaInvestors</a> · <a href="mailto:hello@gigainvestors.com">Contact</a></footer>
  </main>;
}
