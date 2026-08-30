"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

const surface: Record<Activity, string> = { new: "add-strong", add: "add", reduce: "hatch-light", sold: "ghost", hold: "" };

export function HolderTile({ d, tier, rect, q }: { d: HolderTileData; tier: Tier; rect: Rect; q: string }) {
  const router = useRouter();
  const fs = scaleFor(rect.w, rect.h);
  const pad = Math.round(fs * 0.6);
  const textBlock = tier === "full" ? fs * 2.6 + pad : tier === "name" ? fs * 1.4 + pad : 0;
  const href = `/${d.code}?q=${encodeURIComponent(q)}`;
  return (
    <Link
      href={href}
      prefetch={false}
      onPointerEnter={() => router.prefetch(href)}
      className={`tile-edge relative block h-full w-full overflow-hidden bg-paper ${surface[d.activity]}`}
      style={{ fontSize: fs }}
    >
      {d.sketch && rect.w > 14 && (
        <div className={`absolute inset-x-0 bottom-0 ${d.activity === "sold" ? "opacity-40" : ""}`} style={{ top: textBlock, padding: `0 ${pad * 0.5}px` }}>
          <Face slug={d.slug} size={rect.w > 420 ? 1200 : 320} />
        </div>
      )}
      {rect.w > fs * 5 && rect.h > fs * 2.5 && (
        <div className="absolute right-0 top-0 z-10" style={{ padding: pad }}>
          <ChangeBadge activity={d.activity} change={d.change} size={fs} />
        </div>
      )}
      {tier === "face" && (
        <div className="absolute inset-x-0 bottom-0 truncate px-[5px] pb-[3px] text-left font-medium" style={{ fontSize: Math.max(9, fs * 0.78) }}>
          {d.person}
        </div>
      )}
      {tier !== "blank" && tier !== "face" && (
        <div className="absolute inset-x-0 top-0 leading-[1.15]" style={{ padding: pad, paddingRight: rect.w > fs * 5 ? fs * 4 : pad }}>
          <div className="min-w-0">
            <div className="truncate font-semibold">{d.person}</div>
            {tier === "full" && (
              <div className="truncate opacity-60" style={{ fontSize: "0.8em" }}>
                {d.money} · {d.pct} of portfolio
              </div>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
