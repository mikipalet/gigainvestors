import Link from "next/link";
import { UnsubscribeClient } from "./UnsubscribeClient";

export const dynamic = "force-static";
export const metadata = {
  title: "Unsubscribe · GigaInvestors",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://gigainvestors.com/unsubscribe" },
};

export default function Page() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[560px] flex-col gap-6 px-6 py-16 text-[15px] leading-relaxed">
      <Link href="/" className="text-[12px] font-semibold tracking-wide opacity-45 hover:opacity-100">
        GigaInvestors
      </Link>
      <UnsubscribeClient />
    </main>
  );
}
