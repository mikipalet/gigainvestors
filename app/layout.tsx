import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Attribution } from "@/components/Attribution";
import { Search } from "@/components/Search";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = { title: "Superinvestors" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Search />
        <Attribution />
      </body>
    </html>
  );
}
