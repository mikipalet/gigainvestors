"use client";

import { useEffect } from "react";

interface Props {
  quarters: string[];
  q: string;
  onChange: (q: string) => void;
}

export function QuarterSlider({ quarters, q, onChange }: Props) {
  const idx = Math.max(0, quarters.indexOf(q));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && idx > 0) onChange(quarters[idx - 1]);
      if (e.key === "ArrowRight" && idx < quarters.length - 1) onChange(quarters[idx + 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, quarters, onChange]);

  const pct = quarters.length > 1 ? (idx / (quarters.length - 1)) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 h-10 bg-paper select-none">
      <div className="relative mx-4 h-full">
        <input
          type="range"
          min={0}
          max={quarters.length - 1}
          value={idx}
          onChange={(e) => onChange(quarters[Number(e.target.value)])}
          aria-label="Quarter"
          className="slider absolute inset-x-0 top-3 m-0 h-4 w-full cursor-ew-resize appearance-none bg-transparent"
        />
        <div className="pointer-events-none absolute top-[19px] h-px w-full bg-ink/40" />
        <div className="pointer-events-none absolute top-[15px] h-[9px] w-[2px] -translate-x-1/2 bg-ink" style={{ left: `${pct}%` }} />
        <div className="pointer-events-none absolute top-[24px] -translate-x-1/2 text-[11px] leading-none" style={{ left: `${pct}%` }}>
          {q}
        </div>
      </div>
      <style>{`
        .slider::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:16px;background:transparent}
        .slider::-moz-range-thumb{width:24px;height:16px;background:transparent;border:0}
        .slider::-webkit-slider-runnable-track{background:transparent}
        .slider::-moz-range-track{background:transparent}
      `}</style>
    </div>
  );
}
