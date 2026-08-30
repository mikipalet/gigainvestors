"use client";

import Link from "next/link";
import type { Activity } from "@/lib/types";
import type { Rect } from "@/lib/treemap/layout";
import type { Tier } from "@/lib/treemap/tier";
import { scaleFor } from "@/lib/format";
import { ChangeBadge } from "./ChangeBadge";

export interface PositionTileData {
  ticker: string;
  name: string;
  pct: string;
  money: string;
  activity: Activity;
  change: number | null;
}

const surface: Record<Activity, string> = {
  new: "bg-ink text-paper",
  add: "add",
  reduce: "hatch",
  sold: "ghost",
  hold: "",
};

export function PositionTile({ d, tier, rect, q }: { d: PositionTileData; tier: Tier; rect: Rect; q: string }) {
  const fs = scaleFor(rect.w, rect.h);
  const pad = Math.round(fs * 0.55);
  const ghost = d.activity === "sold";
  return (
    <Link
      href={`/s/${encodeURIComponent(d.ticker)}?q=${encodeURIComponent(q)}`}
      prefetch={false}
      className={`tile-edge relative block h-full w-full overflow-hidden bg-paper ${surface[d.activity]}`}
      style={{ fontSize: fs }}
    >
      {tier !== "blank" && (
        <div className="absolute inset-0 flex flex-col justify-between leading-[1.15]" style={{ padding: pad }}>
          <div className="flex items-start justify-between gap-[0.6em]">
            <div className="min-w-0">
              <div className={`truncate font-semibold ${ghost ? "line-through opacity-60" : ""}`}>{d.ticker}</div>
              {tier === "full" && <div className="truncate opacity-60" style={{ fontSize: "0.78em" }}>{d.name}</div>}
            </div>
            <ChangeBadge activity={d.activity} change={d.change} size={fs} />
          </div>
          {tier !== "face" && !ghost && (
            <div className="flex items-baseline justify-between">
              <span className="font-semibold" style={{ fontSize: "1.25em" }}>{d.pct}</span>
              {tier === "full" && <span className="opacity-60">{d.money}</span>}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
