'use client';
import {Timeline} from '@/components/Timeline';
import {useQuarter} from '@/lib/use-quarter';
import { Face } from "@/components/Face";
import type { IndexInvestor } from "@/lib/types";

export function NoHoldings({ meta,quarters }: { meta: IndexInvestor;quarters:string[] }) {
  const [q,setQ]=useQuarter(quarters);
  return (
    <div className="flex h-[calc(100dvh-132px)] sm:h-[calc(100dvh-84px)] flex-col items-center justify-center gap-5 px-6 text-center">
      {meta.sketch && (
        <div className="h-[40vh] w-full max-w-[340px]">
          <Face slug={meta.slug} size={1200} priority />
        </div>
      )}
      <div className="text-[15px] leading-snug">
        <h1 className="text-[19px] font-semibold">{meta.person}</h1>
        <div className="opacity-55">{meta.firm}</div>
      </div>
      <p className="max-w-[380px] text-[13px] opacity-55">0 reported 13F holdings.</p>
    <Timeline quarters={quarters} q={q} onChange={setQ}/></div>
  );
}
