"use client";
import {sharePrice} from "@/lib/value/listing-details";
import {AgentQuarterMetadata} from '@/components/AgentQuarterMetadata';
import {stockUrl} from '@/lib/agents/urls';
import {StockContent} from "@/components/AgentContent";
import { VALUE_PRODUCT_NAME } from '@/lib/value/brand';

import Link from "next/link";
import { useMemo } from "react";
import { effectiveActivity } from "@/components/ChangeBadge";
import { HolderTile, type HolderTileData } from "@/components/HolderTile";
import { StackedBars } from "@/components/StackedBars";
import { Treemap, type Frame } from "@/components/Treemap";
import { formatDelta, formatMoney, formatPct, plural } from "@/lib/format";
import { prevQ } from "@/lib/quarters";
import type { StockData } from "@/lib/types";

type Meta = Record<string, { slug: string; person: string; sketch: boolean }>;

export function Stock({ stock, investors, checklist }: { stock: StockData; investors: Meta; checklist?: {id:string;verdict:string;detail:string} }) {
  const quarters = useMemo(() => stock.quarters.map((x) => x.q), [stock]);
  const q = quarters[quarters.length - 1];
  const current = stock.quarters.find((x) => x.q === q) ?? stock.quarters[stock.quarters.length - 1];
  const before = stock.quarters.find((x) => x.q === prevQ(current.q));

  const frames = useMemo(() => {
    const out: Record<string, Frame<HolderTileData>[]> = {};
    const since: Record<string, string> = {};
    for (const quarter of stock.quarters) {
      const liveNow = new Set(quarter.holders.filter((h) => h.activity !== "sold").map((h) => h.code));
      for (const c of Object.keys(since)) if (!liveNow.has(c)) delete since[c];
      for (const c of liveNow) since[c] ??= quarter.q.slice(0, 4);
      out[quarter.q] = quarter.holders
        .filter((h) => investors[h.code])
        .map((h) => {
          const m = investors[h.code];
          return {
            id: h.code,
            value: h.value,
            data: {
              code: h.code,
              slug: m.slug,
              person: m.person,
              sketch: m.sketch,
              money: formatMoney(h.value),
              pct: formatPct(h.pct),
              activity: effectiveActivity(h.activity, h.change),
              change: h.change,
              since: h.activity === "sold" ? undefined : since[h.code],
            },
          };
        });
    }
    return out;
  }, [stock, investors]);

  const live = current.holders.filter((h) => h.activity !== "sold");
  const total = live.reduce((s, h) => s + h.value, 0);
  const totalBefore = before?.holders.filter((h) => h.activity !== "sold").reduce((s, h) => s + h.value, 0);
  // Dollars held move with price; shares held is the accumulation signal.
  const sharesOf = (qq: typeof current | undefined) =>
    qq && qq.price ? qq.holders.filter((h) => h.activity !== "sold").reduce((s, h) => s + h.value, 0) / qq.price : null;
  const sharesNow = sharesOf(current);
  const sharesBefore = sharesOf(before);
  const sharesDelta = sharesNow !== null && sharesBefore !== null ? formatDelta(sharesNow, sharesBefore) : null;
  const priceDelta = current.price && before?.price ? formatDelta(current.price, before.price) : null;
  const priceText = current.price ? sharePrice(current.price,'USD') : null;
  const normalized = current.holders.map((h) => ({ ...h, activity: effectiveActivity(h.activity, h.change) }));
  const buying = normalized.filter((h) => h.activity === "new" || h.activity === "add").length;
  const selling = normalized.filter((h) => h.activity === "reduce" || h.activity === "sold").length;
  const unchanged = live.length - normalized.filter((h) => h.activity !== "hold" && h.activity !== "sold").length;
  const qIndex = quarters.indexOf(current.q);

  return (
    <main className="company-page">
      <AgentQuarterMetadata canonical={stockUrl(stock.ticker)} quarter={q}/>
      <StockContent stock={stock} people={Object.fromEntries(Object.entries(investors).map(([code,meta])=>[code,meta.person]))} quarter={q}/>
      <div className="locks-scroll flex h-[calc(100dvh-70px)] sm:h-[calc(100dvh-52px)] w-screen flex-col md:flex-row">
        <aside className="flex shrink-0 flex-col p-4 md:w-[28%] md:min-w-[240px] md:max-w-[420px] md:p-6 md:pr-4">
          <Link href={`/?q=${encodeURIComponent(q)}`} className="legacy-brand text-[12px] font-semibold tracking-wide opacity-45 hover:opacity-100">
            GigaInvestors
          </Link>

          <div className="mt-2 text-[13px] leading-snug md:mt-6">
            <div className="text-[26px] font-semibold leading-none md:text-[34px]">{stock.ticker}</div>
            <div className="mt-1 opacity-55">{stock.name}</div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-[22px] font-semibold">{formatMoney(total)}</span>
              {sharesDelta ? (
                <span className="opacity-55">
                  shares held {sharesDelta}
                </span>
              ) : (
                formatDelta(total, totalBefore) && <span className="opacity-55">value {formatDelta(total, totalBefore)}</span>
              )}
            </div>
            <div className="opacity-55">
              held by {plural(live.length, "investor")} · {current.q}
              {priceText && (
                <span>
                  {" "}· price {priceText}
                  {priceDelta && <span> {priceDelta}</span>}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-ink">
                <span className="activity-buy inline-block h-[10px] w-[14px] rounded-[1px]" />
                <span className="font-semibold">{buying}</span> buying
              </span>
              <span className="inline-flex items-center gap-1.5 text-ink">
                <span className="activity-sell inline-block h-[10px] w-[14px] rounded-[1px] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_45%,transparent)]" />
                <span className="font-semibold">{selling}</span> selling
              </span>
              {unchanged > 0 && (
                <span className="inline-flex items-center gap-1.5 opacity-55">
                  <span className="inline-block h-[10px] w-[14px] rounded-[1px] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_25%,transparent)]" />
                  <span className="font-semibold">{unchanged}</span> unchanged
                </span>
              )}
            </div>
            <div className="mt-1.5 hidden text-[13px] opacity-45 md:block">Percentages are the change in shares held, not a return.</div>
          </div>
          <div className="mt-5 h-24 md:h-auto md:min-h-0 md:flex-1 md:pb-2">
            <StackedBars
              quarters={stock.quarters}
              prices={stock.quarters.map((x) => x.price ?? null)}
              labels={quarters}
              index={qIndex}
              caption="investors holding"
              format={formatMoney}
              people={Object.fromEntries(Object.entries(investors).map(([c, m]) => [c, m.person]))}
              onSeek={() => {}}
            />
          </div>
        </aside>
        <Treemap frames={frames} q={current.q} label={(d) => `${d.person} · ${d.money} · ${d.pct} of portfolio${d.since ? ` · since ${d.since}` : ""}`} floor={0.015} className="min-h-0 w-full flex-1" render={(d, tier, rect) => <HolderTile d={d} tier={tier} rect={rect} q={q} />} />
      </div>
    </main>
  );
}
