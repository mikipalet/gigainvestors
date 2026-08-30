import Link from "next/link";
import { Face } from "@/components/Face";

export const metadata = { title: "Charlie" };

export default function Page() {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <Link href="/" className="fixed left-5 top-4 text-[12px] font-semibold tracking-wide opacity-45 hover:opacity-100">
        GigaInvestors
      </Link>
      <div className="h-[52vh] w-full max-w-[420px]">
        <Face slug="charlie-munger" size={1200} priority />
      </div>
      <div className="text-[15px] leading-snug">
        <div className="text-[19px] font-semibold">Charlie Munger</div>
        <div className="opacity-55">1924 – 2023</div>
      </div>
      <p className="max-w-[440px] text-[14px] italic leading-relaxed opacity-70">
        “The big money is not in the buying and the selling, but in the waiting.”
      </p>
    </div>
  );
}
