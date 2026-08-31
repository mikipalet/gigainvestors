import Link from "next/link";
import { Face } from "@/components/Face";

export default function NotFound() {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <Link href="/" className="fixed left-5 top-4 text-[12px] font-semibold tracking-wide opacity-45 hover:opacity-100">
        GigaInvestors
      </Link>
      <div className="h-[40vh] w-full max-w-[340px]">
        <Face slug="norbert-lou" size={1200} priority />
      </div>
      <div className="text-[15px] leading-snug">
        <div className="text-[19px] font-semibold">404</div>
        <div className="opacity-55">nothing filed here</div>
      </div>
      <Link href="/" className="rounded-[3px] bg-ink px-4 py-2 text-[14px] font-semibold text-paper transition-opacity hover:opacity-80">
        back to the investors
      </Link>
      <nav className="flex gap-4 text-[11px] opacity-40">
        <a href="/sitemap.xml">sitemap</a>
        <a href="/llms.txt">llms.txt</a>
        <Link href="/about">about</Link>
      </nav>
    </div>
  );
}
