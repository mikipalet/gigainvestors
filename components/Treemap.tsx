"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  className?: string;
}

export function Treemap<T>({ frames, q, render, className }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current!;
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
      m = new Map(layout(frames[q] ?? [], size.w, size.h).map((r) => [r.id, r]));
      cache.current.set(key, m);
    }
    return m;
  }, [frames, q, size]);

  const dataById = useMemo(() => {
    const m = new Map<string, T>();
    Object.values(frames).forEach((f) => f.forEach((i) => m.set(i.id, i.data)));
    return m;
  }, [frames]);

  const current = new Map((frames[q] ?? []).map((f) => [f.id, f.data]));

  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ""}`}>
      {size.w > 0 &&
        ids.map((id) => {
          const r = rects.get(id);
          const data = current.get(id) ?? dataById.get(id)!;
          if (!r) return <div key={id} className="tile" style={{ opacity: 0, pointerEvents: "none", transform: "translate(0,0) scale(0,0)" }} />;
          const tier = tierFor(r.w, r.h);
          return (
            <div key={id} className="tile" style={{ transform: `translate(${r.x}px,${r.y}px) scale(${r.w},${r.h})` }}>
              <div className="absolute left-0 top-0 origin-top-left overflow-hidden" style={{ width: r.w, height: r.h, transform: `scale(${1 / r.w},${1 / r.h})` }}>
                {render(data, tier, r)}
              </div>
            </div>
          );
        })}
    </div>
  );
}
