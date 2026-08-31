import Link from "next/link";
import { PageFooter } from "@/components/PageFooter";
import { PAGES } from "@/lib/pages";

const page = PAGES.privacy;
export const metadata = { title: page.title, alternates: { canonical: "https://gigainvestors.com/privacy" } };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[640px] flex-col gap-4 px-6 pb-28 pt-16 text-[15px] leading-relaxed">
      <Link href="/" className="text-[12px] font-semibold tracking-wide opacity-45 hover:opacity-100">
        GigaInvestors
      </Link>
      <h1 className="text-[22px] font-semibold">{page.title}</h1>
      {page.paragraphs.map((p) => (
        <p key={p.slice(0, 24)} className="opacity-80">
          {p}
        </p>
      ))}
      <PageFooter />
    </main>
  );
}
