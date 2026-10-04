import {websiteSchema,schemaJson} from '@/lib/agents/schema';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteSearch } from "@/components/SiteSearch";
import "./globals.css";
import "./value-styles";
import "./unified.css";
import "./controls.css";
import { BottomBar } from "@/components/value/BottomBar";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://gigainvestors.com"),
  title: "GigaInvestors",
  description: "What 83 famous investors own, every quarter since 2006, from their 13F filings. Portfolios, positions and who holds what, drawn in pencil.",
  openGraph: {
    title: "GigaInvestors",
    description: "83 gigainvestors, every quarterly move since 2006.",
    url: "https://gigainvestors.com",
    siteName: "GigaInvestors",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "GigaInvestors" },
};

const jsonLd=websiteSchema('main');

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <link rel="describedby" href="/llms.txt"/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson(jsonLd) }} />
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [{ where: { and: [{ href_matches: "/*" }, { not: { href_matches: "/md/*" } }, { not: { href_matches: "/api/*" } }, { not: { href_matches: "/*.xml" } }, { not: { href_matches: "/*.txt" } }] }, eagerness: "moderate" }],
              prefetch: [{ where: { and: [{ href_matches: "/*" }, { not: { href_matches: "/md/*" } }, { not: { href_matches: "/api/*" } }] }, eagerness: "moderate" }],
            }),
          }}
        />
        {children}
        <BottomBar />
        <SiteSearch />
      </body>
    </html>
  );
}
