import Link from "next/link";
import { PAGES } from "@/lib/pages";

const page = PAGES.about;
export const metadata = { title: page.title, alternates: { canonical: "https://gigainvestors.com/about" } };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[640px] flex-col gap-4 px-6 py-16 text-[15px] leading-relaxed">
      <Link href="/" className="text-[12px] font-semibold tracking-wide opacity-45 hover:opacity-100">
        GigaInvestors
      </Link>
      <h1 className="text-[22px] font-semibold">{page.title}</h1>
      {page.paragraphs.map((p) => (
        <p key={p.slice(0, 24)} className="opacity-80">
          {p}
        </p>
      ))}
      <nav className="mt-6 flex gap-4 text-[12px] opacity-50">
        <Link href="/about">about</Link>
        <Link href="/privacy">privacy</Link>
        <Link href="/newsletter">newsletter</Link>
        <a href="/llms.txt">llms.txt</a>
      </nav>
    </main>
  );
}
