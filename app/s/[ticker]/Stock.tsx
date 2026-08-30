"use client";

import Link from "next/link";
import { useMemo } from "react";
import { effectiveActivity } from "@/components/ChangeBadge";
import { HolderTile, type HolderTileData } from "@/components/HolderTile";
import { QuarterSlider } from "@/components/QuarterSlider";
import { Sparkline } from "@/components/Sparkline";
import { Treemap, type Frame } from "@/components/Treemap";
import { formatDelta, formatMoney, formatPct } from "@/lib/format";
import { prevQ } from "@/lib/quarters";
import type { SeriesPoint, StockData } from "@/lib/types";
import { useQuarter } from "@/lib/use-quarter";

type Meta = Record<string, { slug: string; person: string; sketch: boolean; series: SeriesPoint[] }>;

export function Stock({ stock, investors }: { stock: StockData; investors: Meta }) {
  const quarters = useMemo(() => stock.quarters.map((x) => x.q), [stock]);
  const [q, setQ] = useQuarter(quarters);
  const current = stock.quarters.find((x) => x.q === q) ?? stock.quarters[stock.quarters.length - 1];
  const before = stock.quarters.find((x) => x.q === prevQ(current.q));

  const frames = useMemo(() => {
    const out: Record<string, Frame<HolderTileData>[]> = {};
    for (const quarter of stock.quarters) {
      out[quarter.q] = quarter.holders
        .filter((h) => investors[h.code])
        .map((h) => {
          const m = investors[h.code];
          return {
            id: h.code,
            value: h.value,
            data: { code: h.code, slug: m.slug, person: m.person, sketch: m.sketch, money: formatMoney(h.value), pct: formatPct(h.pct), activity: effectiveActivity(h.activity, h.change), change: h.change },
          };
        });
    }
    return out;
  }, [stock, investors]);

  const conviction = useMemo(() => stock.quarters.map((x) => x.holders.filter((h) => h.activity !== "sold").reduce((s, h) => s + h.value, 0)), [stock]);

  const live = current.holders.filter((h) => h.activity !== "sold");
  const total = live.reduce((s, h) => s + h.value, 0);
  const totalBefore = before?.holders.filter((h) => h.activity !== "sold").reduce((s, h) => s + h.value, 0);
  const normalized = current.holders.map((h) => ({ ...h, activity: effectiveActivity(h.activity, h.change) }));
  const buying = normalized.filter((h) => h.activity === "new" || h.activity === "add").length;
  const selling = normalized.filter((h) => h.activity === "reduce" || h.activity === "sold").length;
  const top = live[0] && investors[live[0].code] ? { person: investors[live[0].code].person, money: formatMoney(live[0].value) } : null;
  const qIndex = quarters.indexOf(current.q);

  return (
    <>
      <div className="flex h-[calc(100dvh-48px)] w-screen flex-col md:flex-row">
        <aside className="flex shrink-0 flex-col p-4 md:w-[28%] md:min-w-[240px] md:max-w-[420px] md:p-6 md:pr-4">
          <Link href={`/?q=${encodeURIComponent(q)}`} className="text-[12px] opacity-50 hover:opacity-100">
            ←
          </Link>
          <div className="mt-2 text-[13px] leading-snug md:mt-6 md:min-h-0 md:flex-1">
            <div className="text-[26px] font-semibold leading-none md:text-[34px]">{stock.ticker}</div>
            <div className="mt-1 opacity-55">{stock.name}</div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-[22px] font-semibold">{formatMoney(total)}</span>
              {formatDelta(total, totalBefore) && <span className="opacity-55">{formatDelta(total, totalBefore)}</span>}
            </div>
            <div className="opacity-55">held by {live.length} superinvestors · {current.q}</div>
            <div className="mt-2 flex gap-4">
              <span className="text-buy">
                <span className="font-semibold">{buying}</span> buying
              </span>
              <span className="text-sell">
                <span className="font-semibold">{selling}</span> selling
              </span>
            </div>
            {top && (
              <div className="mt-4 text-[12px] opacity-55">
                top holder {top.person} · {top.money}
              </div>
            )}
          </div>
          <div className="mt-4">
            <Sparkline values={conviction} labels={quarters} index={qIndex} caption="held by superinvestors" format={formatMoney} onSeek={(i) => setQ(quarters[i])} />

          </div>
        </aside>
        <Treemap frames={frames} q={current.q} label={(d) => `${d.person} · ${d.money}`} className="min-h-0 w-full flex-1" render={(d, tier, rect) => <HolderTile d={d} tier={tier} rect={rect} q={q} />} />
      </div>
      <QuarterSlider quarters={quarters} q={current.q} onChange={setQ} />
    </>
  );
}
