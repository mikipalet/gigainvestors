import type { Activity } from "@/lib/types";
import type { Tier } from "@/lib/treemap/tier";

export interface PositionTileData {
  ticker: string;
  pct: string;
  money: string;
  activity: Activity;
}

const overlay: Record<Activity, string> = {
  new: "bg-ink/12",
  add: "bg-ink/12",
  reduce: "bg-ink/4 shadow-[inset_0_0_0_1px_var(--ink)]",
  sold: "border border-dashed border-ink",
  hold: "",
};

export function PositionTile({ d, tier }: { d: PositionTileData; tier: Tier }) {
  const ghost = d.activity === "sold";
  return (
    <div className={`relative h-full w-full ${ghost ? "" : "bg-paper shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_18%,transparent)]"}`}>
      <div className={`pointer-events-none absolute inset-0 ${overlay[d.activity]}`} />
      {tier !== "blank" && (
        <div className={`absolute inset-0 flex flex-col justify-between p-2 text-[12px] leading-tight ${ghost ? "opacity-50" : ""}`}>
          <span className="truncate font-medium">{d.ticker}</span>
          {tier !== "face" && (
            <span className="flex justify-between">
              <span>{d.pct}</span>
              {tier === "full" && <span className="opacity-60">{d.money}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
