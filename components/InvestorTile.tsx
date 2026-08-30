"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Rect } from "@/lib/treemap/layout";
import type { Tier } from "@/lib/treemap/tier";
import { scaleFor } from "@/lib/format";
import { Face } from "./Face";

export interface InvestorTileData {
  code: string;
  slug: string;
  person: string;
  firm: string;
  sketch: boolean;
  money: string;
  delta: string | null;
  positions: number;
  priority: boolean;
}

export function InvestorTile({ d, tier, rect, q }: { d: InvestorTileData; tier: Tier; rect: Rect; q: string }) {
  const router = useRouter();
  const href = `/${d.code}?q=${encodeURIComponent(q)}`;
  const fs = scaleFor(rect.w, rect.h);
  const pad = Math.round(fs * 0.6);
  const textBlock = tier === "full" ? fs * 2.6 + pad : tier === "name" ? fs * 1.4 + pad : 0;
  const size = rect.w > 420 ? 1200 : 320;
  const negative = d.delta?.startsWith("−");
  return (
    <Link
      href={href}
      prefetch={false}
      onPointerEnter={() => router.prefetch(href)}
      className="tile-edge relative block h-full w-full overflow-hidden bg-paper"
      style={{ fontSize: fs }}
    >
      {d.sketch && rect.w > 14 && (
        <div className="absolute inset-x-0 bottom-0" style={{ top: textBlock, padding: `0 ${pad * 0.5}px` }}>
          <Face slug={d.slug} size={size} priority={d.priority} />
        </div>
      )}
      {tier === "face" && (
        <div className="absolute inset-x-0 bottom-0 truncate px-[5px] pb-[3px] text-left font-medium" style={{ fontSize: Math.max(9, fs * 0.78) }}>
          {d.person}
        </div>
      )}
      {tier !== "blank" && tier !== "face" && (
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-[1em] leading-[1.15]" style={{ padding: pad }}>
          <div className="min-w-0">
            <div className="truncate font-semibold">{d.person}</div>
            {tier === "full" && <div className="truncate opacity-55" style={{ fontSize: "0.8em" }}>{d.firm}</div>}
          </div>
          {tier === "full" && (
            <div className="shrink-0 text-right">
              <div className="font-semibold">{d.money}</div>
              <div style={{ fontSize: "0.8em" }} className={negative ? "opacity-55" : "opacity-55"}>
                {d.delta ?? " "}
                <span className="ml-[0.6em]">{d.positions} positions</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
