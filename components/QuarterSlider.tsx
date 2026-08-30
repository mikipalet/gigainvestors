"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  quarters: string[];
  q: string;
  onChange: (q: string) => void;
}

// Slider along the bottom. Drag, ‹ › buttons or arrow keys step, ▸ or space plays.
export function QuarterSlider({ quarters, q, onChange }: Props) {
  const idx = Math.max(0, quarters.indexOf(q));
  const [playing, setPlaying] = useState(false);
  const idxRef = useRef(idx);
  idxRef.current = idx;

  const step = (d: number) => {
    const n = idxRef.current + d;
    if (n >= 0 && n < quarters.length) onChange(quarters[n]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" && (e.target as HTMLInputElement).type !== "range") return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quarters, onChange]);

  useEffect(() => {
    if (!playing) return;
    if (idxRef.current >= quarters.length - 1) onChange(quarters[0]);
    const t = setInterval(() => {
      if (idxRef.current >= quarters.length - 1) return setPlaying(false);
      onChange(quarters[idxRef.current + 1]);
    }, 700);
    return () => clearInterval(t);
  }, [playing, quarters, onChange]);

  const pct = quarters.length > 1 ? (idx / (quarters.length - 1)) * 100 : 0;
  const years = quarters.filter((x) => x.endsWith("Q1") || x === quarters[0]).map((x) => ({ y: x.slice(0, 4), i: quarters.indexOf(x) }));

  const btn = "h-8 w-8 text-[15px] leading-none opacity-45 transition-opacity hover:opacity-100";

  return (
    <div className="fixed inset-x-0 bottom-0 h-12 select-none bg-paper">
      <div className="absolute bottom-2 right-2 top-2 flex items-center">
        <button type="button" className={btn} onClick={() => step(-1)} aria-label="Previous quarter" title="previous quarter (←)">
          ‹
        </button>
        <button type="button" className={btn} onClick={() => setPlaying((p) => !p)} aria-label="Play" title="play through time (space)">
          {playing ? "❚❚" : "▸"}
        </button>
        <button type="button" className={btn} onClick={() => step(1)} aria-label="Next quarter" title="next quarter (→)">
          ›
        </button>
      </div>
      <div className="relative ml-5 mr-[120px] h-full">
        <input
          type="range"
          min={0}
          max={quarters.length - 1}
          value={idx}
          onChange={(e) => onChange(quarters[Number(e.target.value)])}
          aria-label="Quarter"
          className="slider absolute inset-x-0 top-2 z-10 m-0 h-6 w-full cursor-ew-resize appearance-none bg-transparent"
        />
        <div className="pointer-events-none absolute top-[20px] h-px w-full bg-ink/30" />
        {years.map((y) => (
          <div key={y.y} className="pointer-events-none absolute top-[17px] h-[7px] w-px bg-ink/40" style={{ left: `${(y.i / (quarters.length - 1)) * 100}%` }}>
            {quarters.length < 60 || Number(y.y) % 2 === 0 ? (
              <span className="absolute -top-[13px] -translate-x-1/2 text-[10px] leading-none opacity-40">{y.y}</span>
            ) : null}
          </div>
        ))}
        <div className="pointer-events-none absolute top-[14px] h-[13px] w-[2px] -translate-x-1/2 bg-ink" style={{ left: `${pct}%` }} />
        <div
          className="pointer-events-none absolute top-[30px] whitespace-nowrap bg-paper px-1 text-[11px] font-semibold leading-none"
          style={{ left: `clamp(0px, calc(${pct}% - 26px), calc(100% - 52px))` }}
        >
          {q}
        </div>
      </div>
      <style>{`
        .slider::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:24px;background:transparent}
        .slider::-moz-range-thumb{width:28px;height:24px;background:transparent;border:0}
        .slider::-webkit-slider-runnable-track{background:transparent}
        .slider::-moz-range-track{background:transparent}
      `}</style>
    </div>
  );
}
