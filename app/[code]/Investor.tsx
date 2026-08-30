"use client";

import Link from "next/link";
import { useMemo } from "react";
import { effectiveActivity } from "@/components/ChangeBadge";
import { Face } from "@/components/Face";
import { PositionTile, type PositionTileData } from "@/components/PositionTile";
import { QuarterSlider } from "@/components/QuarterSlider";
import { Sparkline } from "@/components/Sparkline";
import { Treemap, type Frame } from "@/components/Treemap";
import { formatDelta, formatMoney, formatPct } from "@/lib/format";
import { prevQ } from "@/lib/quarters";
import type { InvestorData } from "@/lib/types";
import { useQuarter } from "@/lib/use-quarter";

interface Props {
  data: InvestorData;
  slug: string;
  sketch: boolean;
}

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
        data: { ticker: p.ticker, name: p.name, pct: formatPct(p.pct), money: formatMoney(p.value), activity: effectiveActivity(p.activity, p.change), change: p.change },
      }));
    }
    return out;
  }, [data]);

  const live = current.positions.filter((p) => p.activity !== "sold");
  const counts = current.positions.reduce(
    (a, p) => ((a[effectiveActivity(p.activity, p.change)] += 1), a),
    { new: 0, add: 0, reduce: 0, sold: 0, hold: 0 } as Record<string, number>,
  );
  const delta = formatDelta(current.total, before?.total);
  const totals = useMemo(() => data.quarters.map((x) => x.total), [data]);
  const qIndex = quarters.indexOf(current.q);

  return (
    <>
      <div className="flex h-[calc(100vh-48px)] w-screen">
        <aside className="flex w-[28%] min-w-[240px] max-w-[420px] flex-col p-6 pr-4">
          <Link href={`/?q=${encodeURIComponent(q)}`} className="text-[12px] opacity-50 hover:opacity-100">
            ←
          </Link>
          <div className="relative mt-3 min-h-0 flex-1">{sketch && <Face slug={slug} size={1200} priority className="[&_img]:object-left-bottom" />}</div>
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
            <div className="mt-1 flex flex-wrap gap-x-3 text-[12px]">
              {counts.new > 0 && <span className="font-semibold text-buy">{counts.new} new</span>}
              {counts.add > 0 && <span className="text-buy">{counts.add} add{counts.add > 1 ? "s" : ""}</span>}
              {counts.reduce > 0 && <span className="text-sell">{counts.reduce} reduce{counts.reduce > 1 ? "s" : ""}</span>}
              {counts.sold > 0 && <span className="font-semibold text-sell">{counts.sold} sold</span>}
            </div>
          </div>
          <div className="mt-4">
            <Sparkline values={totals} labels={quarters} index={qIndex} caption="portfolio value" format={formatMoney} onSeek={(i) => setQ(quarters[i])} />

          </div>
        </aside>
        <Treemap frames={frames} q={current.q} label={(d) => `${d.ticker} · ${d.name} · ${d.money}`} className="h-full flex-1" render={(d, tier, rect) => <PositionTile d={d} tier={tier} rect={rect} q={q} />} />
      </div>
      <QuarterSlider quarters={quarters} q={current.q} onChange={setQ} />
    </>
  );
}
