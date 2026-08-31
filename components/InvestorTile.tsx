"use client";

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
  const href = `/${d.code}?q=${encodeURIComponent(q)}`;
  const fs = scaleFor(rect.w, rect.h);
  const pad = Math.round(fs * 0.6);
  const textBlock = tier === "full" ? fs * 2.5 + pad : tier === "name" ? fs * 1.4 + pad : 0;
  return (
    <a
      href={href}
      onPointerEnter={() => {
        if (d.sketch) new Image().src = `/faces/v3/${d.slug}-1200.avif`;
      }}
      className="tile-edge relative block h-full w-full overflow-hidden bg-paper"
      style={{ fontSize: fs }}
    >
      {d.sketch && rect.w > 14 && (
        <div className="absolute inset-x-0 bottom-0" style={{ top: textBlock, padding: `0 ${pad * 0.5}px` }}>
          <Face slug={d.slug} size={320} sizes={`${Math.round(rect.w)}px`} priority={d.priority} />
        </div>
      )}
      {tier === "face" && (
        <div className="absolute inset-x-0 bottom-0 truncate px-[5px] pb-[3px] text-left font-medium" style={{ fontSize: Math.max(9, fs * 0.78) }}>
          {d.person}
        </div>
      )}
      {tier !== "blank" && tier !== "face" && (
        <div className="absolute inset-x-0 top-0 leading-[1.2]" style={{ padding: pad }}>
          <div className="truncate font-semibold">{d.person}</div>
          {tier === "full" && (
            <div className="flex items-baseline gap-[0.7em] opacity-55" style={{ fontSize: "0.82em" }}>
              <span className="shrink-0 font-semibold">{d.money}</span>
              {rect.w > fs * 15 && d.delta && <span className="shrink-0">{d.delta}</span>}
              {rect.w > fs * 21 && <span className="truncate">{d.firm}</span>}
            </div>
          )}
        </div>
      )}
    </a>
  );
}
