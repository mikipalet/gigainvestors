"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { layout, type Rect } from "@/lib/treemap/layout";
import { tierFor, type Tier } from "@/lib/treemap/tier";

const REST_ID = "__rest__";

export interface Frame<T> {
  id: string;
  value: number;
  data: T;
}

interface Props<T> {
  frames: Record<string, Frame<T>[]>;
  q: string;
  render: (item: T, tier: Tier, rect: Rect) => ReactNode;
  label?: (item: T) => string;
  floor?: number;
  compactTileArea?: number;
  tileArea?: number;
  compactFloor?: number;
  priority?: (item:T) => boolean;
  onMore?: () => void;
  className?: string;
}

export function Treemap<T>({ frames, q, render, label, floor, className, compactTileArea = 9000, tileArea, compactFloor, priority, onMore }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const lastChange = useRef(0);
  useEffect(() => {
    const now = performance.now();
    const fast = now - lastChange.current < 250;
    lastChange.current = now;
    if (!fast) return;
    setScrubbing(true);
    const t = setTimeout(() => setScrubbing(false), 300);
    return () => clearTimeout(t);
  }, [q]);

  useLayoutEffect(() => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const prevIds = useRef<string[]>([]);
  const ids = useMemo(() => {
    const here = (frames[q] ?? []).map((f) => f.id);
    const merged = [...new Set([...here, ...prevIds.current])];
    prevIds.current = here;
    return merged;
  }, [frames, q]);

  // A phone cannot label 81 tiles, so it shows the ones it can read and folds the tail into
  // one tile that opens the rest. REST_ID is not a real item; it is the door to the full view.
  const cap = size.w > 0 && (size.w < 640 || tileArea) ? Math.max(10, Math.round((size.w * size.h) / (size.w < 640 ? compactTileArea : tileArea!))) : Infinity;
  const items = frames[q] ?? [];
  const capped = !showAll && items.length > cap + 1;
  const shown = useMemo(() => {
    if (!capped) return items;
    const sorted = [...items].sort((a, b) => (priority ? Number(priority(b.data))-Number(priority(a.data)) : 0) || b.value - a.value);
    const head = sorted.slice(0, cap);
    const tail = sorted.slice(cap);
    return [...head, { id: REST_ID, value: tail.reduce((s, i) => s + i.value, 0), data: null as never }];
  }, [items, capped, cap, priority]);
  const restCount = capped ? items.length - cap : 0;

  const rects = useMemo(() => new Map(layout(shown, size.w, size.h, 3, size.w < 640 ? compactFloor ?? floor : floor).map(r => [r.id, r])), [shown, size, floor, compactFloor]);

  const current = useMemo(() => new Map((frames[q] ?? []).map((f) => [f.id, f.data])), [frames, q]);
  const tapped = useRef<string | null>(null);

  const hoverText = hover
    ? (() => {
        if (hover.x === 0 && hover.y === 0) return null;
        const d = current.get(hover.id);
        const r = rects.get(hover.id);
        if (d === undefined || !label) return null;
        const tier = r ? tierFor(r.w, r.h, size.w) : "blank";
        if (tier === "full") return null;
        return label(d);
      })()
    : null;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${scrubbing ? "scrubbing" : ""} ${className ?? ""}`}
      onPointerMove={label ? (e) => setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h)) : undefined}
      onPointerLeave={label ? () => setHover(null) : undefined}
    >
      {size.w > 0 && capped && (() => {
        const r = rects.get(REST_ID);
        if (!r) return null;
        return (
          <button
            type="button"
            onClick={() => onMore ? onMore() : setShowAll(true)}
            className="tile tile-edge flex flex-col items-center justify-center bg-paper text-center"
            style={{ transform: `translate(${r.x}px,${r.y}px)`, width: r.w, height: r.h }}
          >
            <span className="text-[15px] font-semibold">+{restCount} more</span>
            {r.w>180&&r.h>60&&<span className="mt-1 text-[13px] opacity-50">{onMore ? "open company list" : "tap to show every one"}</span>}
          </button>
        );
      })()}
      {size.w > 0 &&
        ids.map((id) => {
          const r = rects.get(id);
          const data = current.get(id);
          if (!r || data === undefined) {
            return <div key={id} className="tile" style={{ opacity: 0, pointerEvents: "none", transform: "translate(0,0)", width: 0, height: 0 }} />;
          }
          const tier = tierFor(r.w, r.h, size.w);
          return (
            <div
              key={id}
              className="tile overflow-hidden"
              style={{ transform: `translate(${r.x}px,${r.y}px)`, width: r.w, height: r.h }}
              onPointerEnter={label ? (e) => setHover({ id, x: e.clientX, y: e.clientY }) : undefined}
              onClickCapture={
                label && tier !== "full"
                  ? (e) => {
                      if (!window.matchMedia("(pointer: coarse)").matches) return;
                      if (tapped.current === id) return;
                      e.preventDefault();
                      e.stopPropagation();
                      tapped.current = id;
                      setHover({ id, x: e.clientX, y: e.clientY });
                    }
                  : undefined
              }
            >
              {render(data, tier, r)}
            </div>
          );
        })}
      {hoverText && hover && (
        <div
          className="pointer-events-none fixed z-[60] max-w-[min(90vw,320px)] bg-ink px-2 py-1 text-[13px] font-medium leading-tight text-paper"
          style={{
            ...(hover.x > (typeof window !== "undefined" ? window.innerWidth : 9999) - 300
              ? { right: (typeof window !== "undefined" ? window.innerWidth : 0) - hover.x + 12 }
              : { left: hover.x + 12 }),
            ...(hover.y > (typeof window !== "undefined" ? window.innerHeight : 9999) - 110
              ? { bottom: (typeof window !== "undefined" ? window.innerHeight : 0) - hover.y + 10 }
              : { top: hover.y + 14 }),
          }}
        >
          {hoverText}
        </div>
      )}
    </div>
  );
}
