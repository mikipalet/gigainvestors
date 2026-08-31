"use client";

import { useEffect, useRef } from "react";

interface Props {
  quarters: string[];
  q: string;
  onChange: (q: string) => void;
}

// Timeline along the bottom. The quarter pill IS the thumb; drag it, click the track,
// use the ‹ › buttons or arrow keys.
export function QuarterSlider({ quarters, q, onChange }: Props) {
  const idx = Math.max(0, quarters.indexOf(q));
  const idxRef = useRef(idx);
  idxRef.current = idx;

  const step = (d: number) => {
    const n = idxRef.current + d;
    if (n >= 0 && n < quarters.length) onChange(quarters[n]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLInputElement;
      if (t?.tagName === "INPUT" && t.type !== "range") return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        step(e.key === "ArrowLeft" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quarters, onChange]);

  const pct = quarters.length > 1 ? (idx / (quarters.length - 1)) * 100 : 0;
  const q1s = quarters.filter((x) => x.endsWith("Q1"));
  const firstQ1Idx = q1s.length ? quarters.indexOf(q1s[0]) : quarters.length;
  const years = (firstQ1Idx >= 4 ? [quarters[0], ...q1s] : q1s).map((x) => ({ y: x.slice(0, 4), i: quarters.indexOf(x) }));

  const btn = "h-8 w-8 text-[15px] leading-none transition-opacity";

  return (
    <div className="fixed inset-x-0 bottom-0 h-12 select-none bg-paper">
      <a
        href="https://www.dataroma.com"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-[3px] left-5 z-10 hidden text-[9px] leading-none opacity-35 transition-opacity hover:opacity-80 md:block"
      >
        quarterly 13F filings · dataroma.com
      </a>
      <div className="absolute bottom-2 right-2 top-2 hidden items-center gap-2 sm:flex">
        <div className="flex items-center">
          <button
            type="button"
            className={`${btn} ${idx === 0 ? "pointer-events-none opacity-15" : "opacity-45 hover:opacity-100"}`}
            onClick={() => step(-1)}
            aria-label="Previous quarter"
            title="previous quarter (←)"
          >
            ‹
          </button>
          <button
            type="button"
            className={`${btn} ${idx === quarters.length - 1 ? "pointer-events-none opacity-15" : "opacity-45 hover:opacity-100"}`}
            onClick={() => step(1)}
            aria-label="Next quarter"
            title="next quarter (→)"
          >
            ›
          </button>
        </div>
      </div>
      <div className="relative ml-5 mr-[84px] h-full sm:mr-[398px]">
        <input
          type="range"
          min={0}
          max={quarters.length - 1}
          value={idx}
          onChange={(e) => onChange(quarters[Number(e.target.value)])}
          onPointerUp={(e) => (e.currentTarget as HTMLInputElement).blur()}
          aria-label="Quarter"
          className="slider absolute inset-x-0 top-1 z-10 m-0 h-10 w-full cursor-ew-resize appearance-none bg-transparent"
        />
        <div className="pointer-events-none absolute top-[24px] h-px w-full bg-ink/30" />
        {years.map((y) => (
          <div key={y.y} className="pointer-events-none absolute top-[21px] h-[7px] w-px bg-ink/40" style={{ left: `${(y.i / (quarters.length - 1)) * 100}%` }}>
            {quarters.length < 60 || Number(y.y) % 2 === 0 ? (
              <span className={`absolute -top-[13px] -translate-x-1/2 text-[10px] leading-none opacity-40 hidden sm:inline`}>{y.y}</span>
            ) : null}
          </div>
        ))}
        <div
          className="pointer-events-none absolute top-[24px] z-20 -translate-y-1/2 whitespace-nowrap rounded-[3px] bg-ink px-[7px] py-[4px] text-[10px] font-semibold leading-none text-paper shadow-[0_0_0_2px_var(--paper)]"
          style={{ left: `clamp(28px, ${pct}%, calc(100% - 28px))`, transform: "translate(-50%, -50%)" }}
        >
          {q}
        </div>
      </div>
      <style>{`
        .slider::-webkit-slider-thumb{-webkit-appearance:none;width:56px;height:40px;background:transparent}
        .slider::-moz-range-thumb{width:56px;height:40px;background:transparent;border:0}
        .slider::-webkit-slider-runnable-track{background:transparent}
        .slider::-moz-range-track{background:transparent}
        .slider:focus-visible{outline:none}
      `}</style>
    </div>
  );
}
