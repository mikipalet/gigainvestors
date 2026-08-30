"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChangeBadge } from "@/components/ChangeBadge";
import { Face } from "@/components/Face";
import { PositionTile, type PositionTileData } from "@/components/PositionTile";
import { QuarterSlider } from "@/components/QuarterSlider";
import { Treemap, type Frame } from "@/components/Treemap";
import { formatDelta, formatMoney, formatPct } from "@/lib/format";
import { prevQ } from "@/lib/quarters";
import type { InvestorData, Position } from "@/lib/types";
import { useQuarter } from "@/lib/use-quarter";

interface Props {
  data: InvestorData;
  slug: string;
  sketch: boolean;
}

const moveWeight = (p: Position) => (p.activity === "sold" ? p.value : Math.abs((p.change ?? 0) / 100) * p.value || p.value);

export function Investor({ data, slug, sketch }: Props) {
  const quarters = useMemo(() => data.quarters.map((x) => x.q), [data]);
  const [q, setQ] = useQuarter(quarters);
  const current = data.quarters.find((x) => x.q === q) ?? data.quarters[data.quarters.length - 1];
  const before = data.quarters.find((x) => x.q === prevQ(current.q));

  const frames = useMemo(() => {
    const out: Record<string, Frame<PositionTileData>[]> = {};
    for (const quarter of data.quarters) {
      out[quarter.q] = quarter.positions.map((p) => ({
        id: p.ticker,
        value: p.value,
        data: { ticker: p.ticker, name: p.name, pct: formatPct(p.pct), money: formatMoney(p.value), activity: p.activity, change: p.change },
      }));
    }
    return out;
  }, [data]);

  const live = current.positions.filter((p) => p.activity !== "sold");
  const moves = current.positions.filter((p) => p.activity !== "hold").sort((a, b) => moveWeight(b) - moveWeight(a));
  const delta = formatDelta(current.total, before?.total);

  return (
    <>
      <div className="flex h-[calc(100vh-48px)] w-screen">
        <aside className="flex w-[28%] min-w-[240px] max-w-[420px] flex-col p-6 pr-4">
          <Link href={`/?q=${encodeURIComponent(q)}`} className="text-[12px] opacity-50 hover:opacity-100">
            ←
          </Link>
          <div className="relative mt-3 h-[34vh] shrink-0">{sketch && <Face slug={slug} size={1200} priority className="[&_img]:object-left-bottom" />}</div>
          <div className="mt-4 text-[13px] leading-snug">
            <div className="text-[17px] font-semibold">{data.person}</div>
            <div className="opacity-55">{data.firm}</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[22px] font-semibold">{formatMoney(current.total)}</span>
              {delta && <span className="opacity-55">{delta}</span>}
            </div>
            <div className="opacity-55">
              {live.length} positions · {current.q}
            </div>
          </div>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto text-[12px] leading-snug">
            {moves.length === 0 && <div className="opacity-40">no changes this quarter</div>}
            {moves.map((p) => (
              <Link key={p.ticker} href={`/s/${encodeURIComponent(p.ticker)}?q=${encodeURIComponent(q)}`} className="flex items-center gap-2 py-[3px] hover:opacity-70">
                <span className="w-[4.2em] shrink-0">
                  <ChangeBadge activity={p.activity} change={p.change} size={11} />
                </span>
                <span className={`truncate font-semibold ${p.activity === "sold" ? "line-through opacity-60" : ""}`}>{p.ticker}</span>
                <span className="truncate opacity-50">{p.name}</span>
                <span className="ml-auto shrink-0 opacity-50">{formatMoney(p.value)}</span>
              </Link>
            ))}
          </div>
        </aside>
        <Treemap frames={frames} q={current.q} className="h-full flex-1" render={(d, tier, rect) => <PositionTile d={d} tier={tier} rect={rect} q={q} />} />
      </div>
      <QuarterSlider quarters={quarters} q={current.q} onChange={setQ} />
    </>
  );
}
