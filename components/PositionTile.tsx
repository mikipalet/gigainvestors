"use client";

import type { Activity } from "@/lib/types";
import type { Rect } from "@/lib/treemap/layout";
import type { Tier } from "@/lib/treemap/tier";
import { scaleFor } from "@/lib/format";
import { ChangeBadge } from "./ChangeBadge";
import { surfaceFor } from "@/lib/surface";

export interface PositionTileData {
  ticker: string;
  name: string;
  pct: string;
  money: string;
  activity: Activity;
  change: number | null;
  strongNew?: boolean;
  since?: string;
  holders?: number;
}

export function PositionTile({ d, tier, rect, q }: { d: PositionTileData; tier: Tier; rect: Rect; q: string }) {
  const fs = scaleFor(rect.w, rect.h);
  const pad = Math.round(fs * 0.55);
  const ghost = d.activity === "sold";
  const href = `/s/${encodeURIComponent(d.ticker)}?q=${encodeURIComponent(q)}`;
  return (
    <a
      href={href}
      className={`tile-edge relative block h-full w-full overflow-hidden bg-paper ${surfaceFor(d.activity, d.change, d.strongNew)}`}
      style={{ fontSize: fs }}
    >
      {rect.w > fs * (d.ticker.length + 6) && rect.h > fs * 2.5 && (
        <div className="absolute right-0 top-0" style={{ padding: pad }}>
          <ChangeBadge activity={d.activity} change={d.change} size={fs} />
        </div>
      )}
      {tier !== "blank" && rect.w > fs * 3.2 && (
        <div className="absolute inset-0 flex flex-col justify-between leading-[1.15]" style={{ padding: pad }}>
          <div className="min-w-0" style={{ paddingRight: rect.w > fs * (d.ticker.length + 6) ? fs * 4 : 0 }}>
            <div className={`truncate font-semibold ${ghost ? "line-through opacity-60" : ""}`}>{d.ticker}</div>
            {tier === "full" && (
              <div className="truncate opacity-60" style={{ fontSize: "0.78em" }}>
                {d.name}
                {rect.w > fs * (d.name.length * 0.55 + 9) && d.since && <span> · since {d.since}</span>}
                {rect.w > fs * (d.name.length * 0.55 + 16) && d.holders !== undefined && <span> · {d.holders} holders</span>}
              </div>
            )}
          </div>
          {tier !== "face" && !ghost && (
            <div className="flex items-baseline justify-between">
              <span className="font-semibold" style={{ fontSize: "1.25em" }}>{d.pct}</span>
              {tier === "full" && <span className="opacity-60">{d.money}</span>}
            </div>
          )}
        </div>
      )}
    </a>
  );
}
