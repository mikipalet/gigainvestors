"use client";

import Link from "next/link";
import type { Activity } from "@/lib/types";
import type { Rect } from "@/lib/treemap/layout";
import type { Tier } from "@/lib/treemap/tier";
import { scaleFor } from "@/lib/format";
import { ChangeBadge } from "./ChangeBadge";
import { Face } from "./Face";

export interface HolderTileData {
  code: string;
  slug: string;
  person: string;
  sketch: boolean;
  money: string;
  pct: string;
  activity: Activity;
  change: number | null;
}

const surface: Record<Activity, string> = { new: "bg-ink/10", add: "bg-ink/10", reduce: "hatch", sold: "ghost", hold: "" };

export function HolderTile({ d, tier, rect, q }: { d: HolderTileData; tier: Tier; rect: Rect; q: string }) {
  const fs = scaleFor(rect.w, rect.h);
  const pad = Math.round(fs * 0.6);
  const textBlock = tier === "full" ? fs * 2.6 + pad : tier === "name" ? fs * 1.4 + pad : 0;
  return (
    <Link
      href={`/${d.code}?q=${encodeURIComponent(q)}`}
      prefetch={false}
      className={`tile-edge relative block h-full w-full overflow-hidden bg-paper ${surface[d.activity]}`}
      style={{ fontSize: fs }}
    >
      {d.sketch && tier !== "blank" && (
        <div className={`absolute inset-x-0 bottom-0 ${d.activity === "sold" ? "opacity-40" : ""}`} style={{ top: textBlock, padding: `0 ${pad * 0.5}px` }}>
          <Face slug={d.slug} size={rect.w > 420 ? 1200 : 320} />
        </div>
      )}
      {tier !== "blank" && tier !== "face" && (
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-[0.6em] leading-[1.15]" style={{ padding: pad }}>
          <div className="min-w-0">
            <div className="truncate font-semibold">{d.person}</div>
            {tier === "full" && (
              <div className="truncate opacity-60" style={{ fontSize: "0.8em" }}>
                {d.money} · {d.pct} of portfolio
              </div>
            )}
          </div>
          <ChangeBadge activity={d.activity} change={d.change} size={fs} />
        </div>
      )}
    </Link>
  );
}
