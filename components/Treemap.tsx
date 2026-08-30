"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { layout, type Rect } from "@/lib/treemap/layout";
import { tierFor, type Tier } from "@/lib/treemap/tier";

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
  className?: string;
}

export function Treemap<T>({ frames, q, render, label, className }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ids = useMemo(() => {
    const s = new Set<string>();
    Object.values(frames).forEach((f) => f.forEach((i) => s.add(i.id)));
    return [...s];
  }, [frames]);

  const cache = useRef(new Map<string, Map<string, Rect>>());
  const rects = useMemo(() => {
    const key = `${q}|${size.w}|${size.h}`;
    let m = cache.current.get(key);
    if (!m) {
      m = new Map(layout(frames[q] ?? [], size.w, size.h, 3).map((r) => [r.id, r]));
      cache.current.set(key, m);
    }
    return m;
  }, [frames, q, size]);

  const current = useMemo(() => new Map((frames[q] ?? []).map((f) => [f.id, f.data])), [frames, q]);

  const hoverText = hover ? (() => { const d = current.get(hover.id); return d !== undefined && label ? label(d) : null; })() : null;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className ?? ""}`}
      onPointerMove={label ? (e) => setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h)) : undefined}
      onPointerLeave={label ? () => setHover(null) : undefined}
    >
      {size.w > 0 &&
        ids.map((id) => {
          const r = rects.get(id);
          const data = current.get(id);
          if (!r || data === undefined) {
            return <div key={id} className="tile" style={{ opacity: 0, pointerEvents: "none", transform: "translate(0,0)", width: 0, height: 0 }} />;
          }
          const tier = tierFor(r.w, r.h);
          return (
            <div
              key={id}
              className="tile overflow-hidden"
              style={{ transform: `translate(${r.x}px,${r.y}px)`, width: r.w, height: r.h }}
              onPointerEnter={label ? (e) => setHover({ id, x: e.clientX, y: e.clientY }) : undefined}
            >
              {render(data, tier, r)}
            </div>
          );
        })}
      {hoverText && hover && (
        <div
          className="pointer-events-none fixed z-40 max-w-[280px] truncate bg-ink px-2 py-1 text-[11px] font-medium leading-none text-paper"
          style={{ left: hover.x + 12, top: hover.y + 14 }}
        >
          {hoverText}
        </div>
      )}
    </div>
  );
}
