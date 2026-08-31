import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Search } from "@/components/Search";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://gigainvestors.com"),
  title: "GigaInvestors",
  description: "82 gigainvestors, every quarterly move since 2006. Portfolios, positions and who holds what, drawn in pencil.",
  openGraph: {
    title: "GigaInvestors",
    description: "82 gigainvestors, every quarterly move since 2006.",
    url: "https://gigainvestors.com",
    siteName: "GigaInvestors",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "GigaInvestors" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://gigainvestors.com/#website",
      url: "https://gigainvestors.com/",
      name: "GigaInvestors",
      description: "What 82 of the world's most followed investors own, and how it changes every quarter, from SEC 13F filings.",
      inLanguage: "en",
      publisher: { "@id": "https://gigainvestors.com/#org" },
    },
    {
      "@type": "Organization",
      "@id": "https://gigainvestors.com/#org",
      name: "GigaInvestors",
      url: "https://gigainvestors.com/",
      logo: "https://gigainvestors.com/apple-icon.png",
      contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: "hello@gigainvestors.com", url: "https://gigainvestors.com/contact", availableLanguage: "en" }],
    },
    {
      "@type": "Dataset",
      name: "GigaInvestors 13F portfolios",
      description: "Quarterly portfolio holdings of 82 tracked investors since 2006, derived from SEC Form 13F filings via dataroma.com.",
      url: "https://gigainvestors.com/",
      license: "https://gigainvestors.com/about",
      isAccessibleForFree: true,
      creator: { "@id": "https://gigainvestors.com/#org" },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
        <Search />
      </body>
    </html>
  );
}
