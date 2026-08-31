"use client";

import Link from "next/link";
import { useMemo } from "react";
import { effectiveActivity } from "@/components/ChangeBadge";
import { Face } from "@/components/Face";
import { PositionTile, type PositionTileData } from "@/components/PositionTile";
import { QuarterSlider } from "@/components/QuarterSlider";
import { Sparkline } from "@/components/Sparkline";
import { Treemap, type Frame } from "@/components/Treemap";
import { formatDelta, formatMoney, formatPct, plural } from "@/lib/format";
import { prevQ } from "@/lib/quarters";
import { fromWire, type InvestorWire } from "@/lib/wire";
import { useQuarter } from "@/lib/use-quarter";

interface Props {
  wire: InvestorWire;
  slug: string;
  sketch: boolean;
  holders: Record<string, number>;
}

const addedDollars = (p: { value: number; change: number | null; activity: string }) =>
  p.activity === "new" ? p.value : p.activity === "add" && p.change ? p.value - p.value / (1 + p.change / 100) : 0;
const removedDollars = (p: { value: number; change: number | null; activity: string }) =>
  p.activity === "sold" ? p.value : p.activity === "reduce" && p.change ? p.value / (1 + p.change / 100) - p.value : 0;

export function Investor({ wire, slug, sketch, holders }: Props) {
  const data = useMemo(() => fromWire(wire), [wire]);
  const quarters = useMemo(() => data.quarters.map((x) => x.q), [data]);
  const [q, setQ] = useQuarter(quarters);
  const current = data.quarters.find((x) => x.q === q) ?? data.quarters[data.quarters.length - 1];
  const before = data.quarters.find((x) => x.q === prevQ(current.q));

  const frames = useMemo(() => {
    const out: Record<string, Frame<PositionTileData>[]> = {};
    const since: Record<string, string> = {};
    for (const quarter of data.quarters) {
      const liveNow = new Set(quarter.positions.filter((p) => p.activity !== "sold").map((p) => p.ticker));
      for (const t of Object.keys(since)) if (!liveNow.has(t)) delete since[t];
      for (const t of liveNow) since[t] ??= quarter.q.slice(0, 4);
      const topNew = new Set(
        quarter.positions
          .filter((p) => p.activity === "new")
          .sort((a, b) => b.value - a.value)
          .slice(0, 3)
          .map((p) => p.ticker),
      );
      const firstOnRecord = quarter.q === data.quarters[0].q;
      out[quarter.q] = quarter.positions.map((p) => ({
        id: p.ticker,
        value: p.value,
        data: {
          ticker: p.ticker,
          name: p.name,
          pct: formatPct(p.pct),
          money: formatMoney(p.value),
          activity: firstOnRecord ? "hold" : effectiveActivity(p.activity, p.change),
          change: firstOnRecord ? null : p.change,
          strongNew: !firstOnRecord && topNew.has(p.ticker),
          since: p.activity === "sold" ? undefined : since[p.ticker],
          holders: holders[p.ticker],
        },
      }));
    }
    return out;
  }, [data, holders]);

  const firstOnRecord = current.q === data.quarters[0].q;
  const live = current.positions.filter((p) => p.activity !== "sold");
  const counts = current.positions.reduce(
    (a, p) => ((a[firstOnRecord ? "hold" : effectiveActivity(p.activity, p.change)] += 1), a),
    { new: 0, add: 0, reduce: 0, sold: 0, hold: 0 } as Record<string, number>,
  );
  const delta = formatDelta(current.total, before?.total);
  const totals = useMemo(() => data.quarters.map((x) => x.total), [data]);
  const topN = Math.min(10, live.length);
  const topShare = Math.round([...live].sort((a, b) => b.pct - a.pct).slice(0, topN).reduce((s, p) => s + p.pct, 0));
  const bought = firstOnRecord ? 0 : current.positions.reduce((s, p) => s + addedDollars({ ...p, activity: effectiveActivity(p.activity, p.change) }), 0);
  const sold = firstOnRecord ? 0 : current.positions.reduce((s, p) => s + removedDollars({ ...p, activity: effectiveActivity(p.activity, p.change) }), 0);
  const flowMax = Math.max(bought, sold, 1);
  const qIndex = quarters.indexOf(current.q);

  return (
    <>
      <div className="locks-scroll flex h-[calc(100dvh-84px)] sm:h-[calc(100dvh-48px)] w-screen flex-col md:flex-row">
        <aside className="flex shrink-0 flex-col p-4 md:w-[28%] md:min-w-[240px] md:max-w-[420px] md:p-6 md:pr-4">
          <Link href={`/?q=${encodeURIComponent(q)}`} className="text-[12px] font-semibold tracking-wide opacity-45 hover:opacity-100">
            GigaInvestors
          </Link>
          <div className="relative mt-3 hidden min-h-0 flex-1 md:block">{sketch && <Face slug={slug} size={1200} priority className="[&_img]:object-left-bottom" />}</div>
          <div className="flex items-start gap-4 md:mt-4 md:block">
            {sketch && <div className="relative h-24 w-20 shrink-0 md:hidden"><Face slug={slug} size={320} priority /></div>}
            <div className="text-[13px] leading-snug">
            <div className="text-[17px] font-semibold">{data.person}</div>
            <div className="opacity-55">{data.firm}</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[22px] font-semibold">{formatMoney(current.total)}</span>
              {delta && <span className="opacity-55">{delta}</span>}
            </div>
            <div className="opacity-55">
              {plural(live.length, "position")}{live.length > 1 ? ` · top ${topN} = ${topShare}%` : ""} · {current.q}
            </div>
            {firstOnRecord && <div className="mt-1.5 text-[12px] opacity-55">First filing on record. What changed that quarter is not knowable from here.</div>}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
              {counts.new > 0 && (
                <span className="inline-flex items-center gap-1.5 text-buy"><span className="buy-solid inline-block h-[10px] w-[14px] rounded-[1px]" />{counts.new} new</span>
              )}
              {counts.add > 0 && (
                <span className="inline-flex items-center gap-1.5 text-buy"><span className="add inline-block h-[10px] w-[14px] rounded-[1px] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--buy)_45%,transparent)]" />{counts.add} add{counts.add > 1 ? "s" : ""}</span>
              )}
              {counts.reduce > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sell"><span className="hatch inline-block h-[10px] w-[14px] rounded-[1px] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--sell)_45%,transparent)]" />{counts.reduce} reduce{counts.reduce > 1 ? "s" : ""}</span>
              )}
              {counts.sold > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sell"><span className="inline-block h-[10px] w-[14px] rounded-[1px] border border-dashed border-sell" />{counts.sold} sold</span>
              )}
            </div>
            {(bought > 0 || sold > 0) && (
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="w-[4.5em] shrink-0 text-right text-buy">{bought > 0 ? `+${formatMoney(bought)}` : ""}</span>
                <div className="flex h-[6px] flex-1 items-stretch">
                  <div className="flex flex-1 justify-end">
                    <div className="bg-buy" style={{ width: `${(bought / flowMax) * 100}%` }} />
                  </div>
                  <div className="w-px bg-ink/40" />
                  <div className="flex flex-1">
                    <div className="bg-sell" style={{ width: `${(sold / flowMax) * 100}%` }} />
                  </div>
                </div>
                <span className="w-[4.5em] shrink-0 text-sell">{sold > 0 ? `−${formatMoney(sold)}` : ""}</span>
              </div>
            )}
            </div>
          </div>
          <div className="mt-3 md:mt-4">
            <Sparkline values={totals} labels={quarters} index={qIndex} caption="portfolio value" format={formatMoney} onSeek={(i) => setQ(quarters[i])} log height="h-28" />

          </div>
        </aside>
        <Treemap frames={frames} q={current.q} label={(d) => `${d.ticker} · ${d.name} · ${d.money} · ${d.pct}${d.since ? ` · since ${d.since}` : ""}`} className="min-h-0 w-full flex-1" render={(d, tier, rect) => <PositionTile d={d} tier={tier} rect={rect} q={q} />} />
      </div>
      <QuarterSlider quarters={quarters} q={current.q} onChange={setQ} />
    </>
  );
}
