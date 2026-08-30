"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Face } from "@/components/Face";
import { PositionTile, type PositionTileData } from "@/components/PositionTile";
import { QuarterSlider } from "@/components/QuarterSlider";
import { Treemap, type Frame } from "@/components/Treemap";
import { formatDelta, formatMoney, formatPct } from "@/lib/format";
import { prevQ } from "@/lib/quarters";
import type { InvestorData } from "@/lib/types";
import { useQuarter } from "@/lib/use-quarter";

interface Props {
  data: InvestorData;
  slug: string;
  sketch: boolean;
  allQuarters: string[];
  initialQ?: string;
}

export function Investor({ data, slug, sketch, allQuarters, initialQ }: Props) {
  const quarters = data.quarters.map((x) => x.q);
  const [q, setQ] = useQuarter(quarters, initialQ && quarters.includes(initialQ) ? initialQ : undefined);
  const current = data.quarters.find((x) => x.q === q) ?? data.quarters[data.quarters.length - 1];
  const before = data.quarters.find((x) => x.q === prevQ(current.q));

  const frames = useMemo(() => {
    const out: Record<string, Frame<PositionTileData>[]> = {};
    for (const quarter of data.quarters) {
      out[quarter.q] = quarter.positions.map((p) => ({
        id: p.ticker,
        value: p.value,
        data: { ticker: p.ticker, pct: formatPct(p.pct), money: formatMoney(p.value), activity: p.activity },
      }));
    }
    return out;
  }, [data]);

  const live = current.positions.filter((p) => p.activity !== "sold").length;
  const delta = formatDelta(current.total, before?.total);
  void allQuarters;

  return (
    <>
      <div className="flex h-[calc(100vh-40px)] w-screen">
        <aside className="flex w-[30%] min-w-[220px] flex-col justify-between p-6">
          <Link href={`/?q=${encodeURIComponent(q)}`} className="text-[12px] opacity-60">
            ←
          </Link>
          <div className="my-4 flex-1 overflow-hidden">{sketch && <Face slug={slug} size={1200} priority className="block h-full" />}</div>
          <div className="text-[13px] leading-snug">
            <div className="font-medium">{data.person}</div>
            <div className="opacity-60">{data.firm}</div>
            <div className="mt-3">
              {formatMoney(current.total)}
              {delta && <span className="ml-2 opacity-60">{delta}</span>}
            </div>
            <div className="opacity-60">{live} positions</div>
          </div>
        </aside>
        <Treemap frames={frames} q={current.q} className="h-full flex-1" render={(d, tier) => <PositionTile d={d} tier={tier} />} />
      </div>
      <QuarterSlider quarters={quarters} q={current.q} onChange={setQ} />
    </>
  );
}
