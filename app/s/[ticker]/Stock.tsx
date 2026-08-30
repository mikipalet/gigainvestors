"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChangeBadge, effectiveActivity } from "@/components/ChangeBadge";
import { HolderTile, type HolderTileData } from "@/components/HolderTile";
import { QuarterSlider } from "@/components/QuarterSlider";
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

  const live = current.holders.filter((h) => h.activity !== "sold");
  const total = live.reduce((s, h) => s + h.value, 0);
  const totalBefore = before?.holders.filter((h) => h.activity !== "sold").reduce((s, h) => s + h.value, 0);
  const normalized = current.holders.map((h) => ({ ...h, activity: effectiveActivity(h.activity, h.change) }));
  const buying = normalized.filter((h) => h.activity === "new" || h.activity === "add").length;
  const selling = normalized.filter((h) => h.activity === "reduce" || h.activity === "sold").length;
  const movers = normalized
    .filter((h) => h.activity !== "hold")
    .sort((a, b) => (b.activity === "sold" ? b.value : Math.abs((b.change ?? 100) / 100) * b.value) - (a.activity === "sold" ? a.value : Math.abs((a.change ?? 100) / 100) * a.value));

  return (
    <>
      <div className="flex h-[calc(100vh-48px)] w-screen">
        <aside className="flex w-[28%] min-w-[240px] max-w-[420px] flex-col p-6 pr-4">
          <Link href={`/?q=${encodeURIComponent(q)}`} className="text-[12px] opacity-50 hover:opacity-100">
            ←
          </Link>
          <div className="mt-6 text-[13px] leading-snug">
            <div className="text-[34px] font-semibold leading-none">{stock.ticker}</div>
            <div className="mt-1 opacity-55">{stock.name}</div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-[22px] font-semibold">{formatMoney(total)}</span>
              {formatDelta(total, totalBefore) && <span className="opacity-55">{formatDelta(total, totalBefore)}</span>}
            </div>
            <div className="opacity-55">held by {live.length} superinvestors · {current.q}</div>
            <div className="mt-3 flex gap-4">
              <span>
                <span className="font-semibold">{buying}</span> <span className="opacity-55">buying</span>
              </span>
              <span>
                <span className="font-semibold">{selling}</span> <span className="opacity-55">selling</span>
              </span>
            </div>
          </div>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto text-[12px] leading-snug">
            {movers.map((h) => (
              <Link key={h.code} href={`/${h.code}?q=${encodeURIComponent(q)}`} className="flex items-center gap-2 py-[3px] hover:opacity-70">
                <span className="w-[4.2em] shrink-0">
                  <ChangeBadge activity={h.activity} change={h.change} size={11} />
                </span>
                <span className={`truncate font-semibold ${h.activity === "sold" ? "line-through opacity-60" : ""}`}>{investors[h.code]?.person ?? h.code}</span>
                <span className="ml-auto shrink-0 opacity-50">{formatMoney(h.value)}</span>
              </Link>
            ))}
          </div>
        </aside>
        <Treemap frames={frames} q={current.q} className="h-full flex-1" render={(d, tier, rect) => <HolderTile d={d} tier={tier} rect={rect} q={q} />} />
      </div>
      <QuarterSlider quarters={quarters} q={current.q} onChange={setQ} />
    </>
  );
}
