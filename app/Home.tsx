"use client";

import { useMemo } from "react";
import { InvestorTile, type InvestorTileData } from "@/components/InvestorTile";
import { QuarterSlider } from "@/components/QuarterSlider";
import { Treemap, type Frame } from "@/components/Treemap";
import { formatDelta, formatMoney } from "@/lib/format";
import { prevQ } from "@/lib/quarters";
import type { Index } from "@/lib/types";
import { useQuarter } from "@/lib/use-quarter";

export function Home({ index }: { index: Index }) {
  const [q, setQ] = useQuarter(index.quarters);

  const frames = useMemo(() => {
    const out: Record<string, Frame<InvestorTileData>[]> = {};
    for (const quarter of index.quarters) {
      const items: Frame<InvestorTileData>[] = [];
      for (const inv of index.investors) {
        const pt = inv.series.find((s) => s.q === quarter);
        if (!pt) continue;
        const before = inv.series.find((s) => s.q === prevQ(quarter))?.total;
        items.push({
          id: inv.code,
          value: pt.total,
          data: {
            code: inv.code,
            slug: inv.slug,
            person: inv.person,
            firm: inv.firm,
            sketch: inv.sketch,
            money: formatMoney(pt.total),
            delta: formatDelta(pt.total, before),
            positions: pt.positions,
            priority: false,
          },
        });
      }
      items.sort((a, b) => b.value - a.value).slice(0, 16).forEach((i) => (i.data.priority = true));
      out[quarter] = items;
    }
    return out;
  }, [index]);

  return (
    <>
      <Treemap frames={frames} q={q} label={(d) => `${d.person} · ${d.money}`} className="h-[calc(100vh-48px)] w-screen" render={(d, tier, rect) => <InvestorTile d={d} tier={tier} rect={rect} q={q} />} />
      <QuarterSlider quarters={index.quarters} q={q} onChange={setQ} />
    </>
  );
}
