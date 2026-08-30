"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  series?: number[];
}

const surface: Record<Activity, string> = {
  new: "buy-solid",
  add: "add",
  reduce: "hatch",
  sold: "ghost",
  hold: "",
};

export function PositionTile({ d, tier, rect, q }: { d: PositionTileData; tier: Tier; rect: Rect; q: string }) {
  const router = useRouter();
  const fs = scaleFor(rect.w, rect.h);
  const pad = Math.round(fs * 0.55);
  const ghost = d.activity === "sold";
  const href = `/s/${encodeURIComponent(d.ticker)}?q=${encodeURIComponent(q)}`;
  return (
    <Link
      href={href}
      prefetch={false}
      onPointerEnter={() => router.prefetch(href)}
      className={`tile-edge relative block h-full w-full overflow-hidden bg-paper ${surface[d.activity]}`}
      style={{ fontSize: fs }}
    >
      {rect.w > fs * 5 && rect.h > fs * 2.5 && (
        <div className="absolute right-0 top-0" style={{ padding: pad }}>
          <ChangeBadge activity={d.activity} change={d.change} size={fs} />
        </div>
      )}
      {tier === "full" && d.series && d.series.length > 3 && !ghost && (
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] w-full opacity-[0.1]">
          {d.series.map((v, i) => {
            const n = d.series!.length;
            const max = Math.max(...d.series!);
            const bw = (100 / n) * 0.66;
            const bh = Math.max((v / Math.max(max, 1)) * 29, v > 0 ? 0.5 : 0);
            return <rect key={i} x={(i / n) * 100 + (100 / n - bw) / 2} y={30 - bh} width={bw} height={bh} fill="var(--ink)" />;
          })}
        </svg>
      )}
      {tier !== "blank" && (
        <div className="absolute inset-0 flex flex-col justify-between leading-[1.15]" style={{ padding: pad }}>
          <div className="min-w-0" style={{ paddingRight: rect.w > fs * 5 ? fs * 4 : 0 }}>
            <div className={`truncate font-semibold ${ghost ? "line-through opacity-60" : ""}`}>{d.ticker}</div>
            {tier === "full" && <div className="truncate opacity-60" style={{ fontSize: "0.78em" }}>{d.name}</div>}
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
