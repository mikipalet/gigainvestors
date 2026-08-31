import Link from "next/link";
import { Face } from "@/components/Face";
import type { IndexInvestor } from "@/lib/types";

export function NoHoldings({ meta }: { meta: IndexInvestor }) {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <Link href="/" className="fixed left-5 top-4 text-[12px] font-semibold tracking-wide opacity-45 hover:opacity-100">
        GigaInvestors
      </Link>
      {meta.sketch && (
        <div className="h-[40vh] w-full max-w-[340px]">
          <Face slug={meta.slug} size={1200} priority />
        </div>
      )}
      <div className="text-[15px] leading-snug">
        <h1 className="text-[19px] font-semibold">{meta.person}</h1>
        <div className="opacity-55">{meta.firm}</div>
      </div>
      <p className="max-w-[380px] text-[13px] opacity-55">No 13F holdings on file for the latest quarter. The seat stays; the treemap returns when a filing does.</p>
    </div>
  );
}
