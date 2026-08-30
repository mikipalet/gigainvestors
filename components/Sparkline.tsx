"use client";

import { useRef, useState } from "react";

interface Props {
  values: number[];
  labels: string[];
  index: number;
  caption: string;
  format: (v: number) => string;
  onSeek: (i: number) => void;
}

// The whole history as one ink line. Hover to read a quarter, click or drag to travel to it.
export function Sparkline({ values, labels, index, caption, format, onSeek }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (values.length < 2) return null;
  const W = 100;
  const H = 34;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => 3 + (H - 6) * (1 - (v - min) / range);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join("");

  const idxAt = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(t * (values.length - 1));
  };

  const shown = hoverIdx ?? index;
  const dotLeft = (x(shown) / W) * 100;
  const dotTop = (y(values[shown]) / H) * 100;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[11px] leading-none">
        <span className="opacity-45">{caption}</span>
        <span className={hoverIdx !== null ? "font-semibold" : "opacity-45"}>
          {format(values[shown])} · {labels[shown]}
        </span>
      </div>
      <div className="relative">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="slider"
          aria-label={caption}
          className="h-16 w-full cursor-ew-resize touch-none select-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onSeek(idxAt(e.clientX));
          }}
          onPointerMove={(e) => {
            const i = idxAt(e.clientX);
            setHoverIdx(i);
            if (e.buttons > 0) onSeek(i);
          }}
          onPointerLeave={() => setHoverIdx(null)}
        >
          <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.75" />
          <line x1={x(index)} y1="0" x2={x(index)} y2={H} stroke="var(--ink)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.35" />
          {hoverIdx !== null && hoverIdx !== index && (
            <line x1={x(hoverIdx)} y1="0" x2={x(hoverIdx)} y2={H} stroke="var(--ink)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.15" />
          )}
        </svg>
        <div
          className="pointer-events-none absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${dotLeft}%`, top: `${dotTop}%` }}
        />
      </div>
    </div>
  );
}
