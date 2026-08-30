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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Search />
      </body>
    </html>
  );
}
