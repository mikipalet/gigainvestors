import Link from "next/link";
import type { Tier } from "@/lib/treemap/tier";
import { Face } from "./Face";

export interface InvestorTileData {
  code: string;
  slug: string;
  person: string;
  sketch: boolean;
  money: string;
  delta: string | null;
  priority: boolean;
}

export function InvestorTile({ d, tier, q }: { d: InvestorTileData; tier: Tier; q: string }) {
  const showFace = d.sketch && tier !== "blank";
  return (
    <Link href={`/${d.code}?q=${encodeURIComponent(q)}`} prefetch className="relative block h-full w-full bg-paper">
      {showFace && <Face slug={d.slug} size={320} priority={d.priority} className="absolute inset-0" />}
      {(tier === "full" || tier === "name") && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-2 pb-1.5 text-[12px] leading-tight">
          <span className="truncate font-medium">{d.person}</span>
          {tier === "full" && (
            <span className="shrink-0 text-right">
              {d.money}
              {d.delta && <span className="ml-1.5 opacity-60">{d.delta}</span>}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
