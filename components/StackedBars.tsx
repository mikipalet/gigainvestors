"use client";

import { useMemo, useRef, useState } from "react";
import type { StockQuarter } from "@/lib/types";

interface Props {
  quarters: StockQuarter[];
  prices: (number | null)[];
  labels: string[];
  index: number;
  caption: string;
  format: (v: number) => string;
  people: Record<string, string>;
  onSeek: (i: number) => void;
}

const SHADES = [0.88, 0.62, 0.42, 0.28, 0.18];

// Dollars held per quarter, stacked by investor. Hover names the segment, drag travels.
export function StackedBars({ quarters, prices, labels, index, caption, format, people, onSeek }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ qi: number; code: string | null } | null>(null);

  const { columns, max, order } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const q of quarters) for (const h of q.holders) if (h.activity !== "sold") totals.set(h.code, (totals.get(h.code) ?? 0) + h.value);
    const order = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const rank = new Map(order.map((c, i) => [c, i]));
    const columns = quarters.map((q) => {
      const segs = q.holders.filter((h) => h.activity !== "sold").sort((a, b) => (rank.get(a.code) ?? 999) - (rank.get(b.code) ?? 999));
      return { segs, total: segs.reduce((s, h) => s + h.value, 0) };
    });
    return { columns, max: Math.max(...columns.map((c) => c.total), 1), order: rank };
  }, [quarters]);

  if (quarters.length < 2) return null;
  const W = 100;
  const H = 100;
  const band = W / quarters.length;
  const bw = band * 0.72;

  const locate = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    const qi = Math.max(0, Math.min(quarters.length - 1, Math.floor(((clientX - r.left) / r.width) * quarters.length)));
    const yv = (1 - (clientY - r.top) / r.height) * max;
    let acc = 0;
    let code: string | null = null;
    for (const seg of columns[qi].segs) {
      acc += seg.value;
      if (yv <= acc) {
        code = seg.code;
        break;
      }
    }
    return { qi, code };
  };

  const priceMax = Math.max(...prices.filter((p): p is number => p !== null), 0);
  const pricePath = (() => {
    if (priceMax <= 0) return null;
    const segs: string[] = [];
    let pen = false;
    prices.forEach((p, i) => {
      if (p === null) {
        pen = false;
        return;
      }
      const px = (i + 0.5) * (W / prices.length);
      const py = 4 + (1 - p / priceMax) * (H - 12);
      segs.push(`${pen ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`);
      pen = true;
    });
    return segs.join("");
  })();

  const shown = hover?.qi ?? index;
  const hoverSeg = hover?.code ? columns[hover.qi].segs.find((s) => s.code === hover.code) : null;
  const priceAt = prices[shown];
  const priceText = priceAt !== null && priceAt !== undefined ? ` · price $${priceAt >= 100 ? Math.round(priceAt) : priceAt.toFixed(1)}` : "";
  const readout = (hoverSeg && hover?.code ? `${people[hover.code] ?? hover.code} · ${format(hoverSeg.value)} · ${labels[shown]}` : `${format(columns[shown]?.total ?? 0)} · ${labels[shown]}`) + priceText;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px] leading-none">
        <span className="shrink-0 opacity-45">{caption}</span>
        <span className={`truncate ${hover ? "font-semibold" : "opacity-45"}`}>{readout}</span>
      </div>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="slider"
        aria-label={caption}
        className="min-h-0 w-full flex-1 cursor-ew-resize touch-none select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onSeek(locate(e.clientX, e.clientY).qi);
        }}
        onPointerMove={(e) => {
          const l = locate(e.clientX, e.clientY);
          setHover(l);
          if (e.buttons > 0) onSeek(l.qi);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {hover && (
          <rect x={hover.qi * band} y="0" width={band} height={H} fill="var(--ink)" opacity="0.07" />
        )}
        {columns.map((col, qi) => {
          const x = qi * band + (band - bw) / 2;
          const dim = qi === index ? 1 : qi === hover?.qi ? 0.85 : 0.55;
          let acc = 0;
          return col.segs.map((seg) => {
            const y0 = (acc / max) * (H - 1);
            acc += seg.value;
            const y1 = (acc / max) * (H - 1);
            const highlighted = hover?.qi === qi && hover.code === seg.code;
            return (
              <rect
                key={`${qi}-${seg.code}`}
                x={x}
                y={H - y1}
                width={bw}
                height={Math.max(y1 - y0 - 0.35, 0.25)}
                fill="var(--ink)"
                opacity={Math.min(1, SHADES[(order.get(seg.code) ?? 0) % SHADES.length] * dim + (highlighted ? 0.15 : 0))}
              />
            );
          });
        })}
        {pricePath && (
          <>
            <path d={pricePath} fill="none" stroke="var(--paper)" strokeWidth="3.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={pricePath} fill="none" stroke="var(--ink)" strokeWidth="1.3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.8" />
          </>
        )}
      </svg>
    </div>
  );
}
