"use client";

import {FitText} from "./FitText";
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
  const href = `/${d.code}?q=${encodeURIComponent(q.replace(/\s/g,''))}`;
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
          <Face slug={d.slug} size={rect.w>320?1200:320} sizes={`${Math.round(rect.w)}px`} priority={d.priority} />
        </div>
      )}
      {tier === "face" && (
        <FitText className="absolute inset-x-0 bottom-0 bg-[color-mix(in_oklab,var(--paper)_82%,transparent)] px-[5px] pb-[3px] pt-[2px] text-left font-medium" style={{ fontSize: Math.max(13, fs * 0.78) }}>
          {d.person}
        </FitText>
      )}
      {tier !== "blank" && tier !== "face" && (
        <div className="absolute inset-x-0 top-0 leading-[1.2]" style={{ padding: pad }}>
          <FitText className="font-semibold">{d.person}</FitText>
          {tier === "full" && (
            <div className="flex items-baseline gap-[0.7em] opacity-55" style={{ fontSize: Math.max(13,fs*.82) }}>
              <span className="shrink-0 font-semibold">{d.money}</span>
              {rect.w > fs * 15 && d.delta && <span className="shrink-0">{d.delta}</span>}
              {rect.w > fs * 21 && <FitText>{d.firm}</FitText>}
            </div>
          )}
        </div>
      )}
    </a>
  );
}
