"use client";

import { useRef } from "react";

interface Props {
  values: number[];
  index: number;
  onSeek: (i: number) => void;
  ariaLabel: string;
}

// The whole history as one ink line. Click or drag to travel in time.
export function Sparkline({ values, index, onSeek, ariaLabel }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  if (values.length < 2) return null;
  const W = 100;
  const H = 34;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => 3 + (H - 6) * (1 - (v - min) / range);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join("");

  const seek = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(Math.round(t * (values.length - 1)));
  };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="slider"
      aria-label={ariaLabel}
      className="h-16 w-full cursor-ew-resize touch-none select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        seek(e.clientX);
      }}
      onPointerMove={(e) => e.buttons > 0 && seek(e.clientX)}
    >
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.75" />
      <line x1={x(index)} y1="0" x2={x(index)} y2={H} stroke="var(--ink)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.35" />
      <circle cx={x(index)} cy={y(values[index])} r="2.4" fill="var(--ink)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
