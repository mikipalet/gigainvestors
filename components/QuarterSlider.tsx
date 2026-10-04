"use client";

import { useEffect, useRef, useState, startTransition } from "react";

interface Props {
  quarters: string[];
  q: string;
  onChange: (q: string, immediate?: boolean) => void;
  note?: string;
  embedded?: boolean;
  label?: string;
  onPrefetch?: (q: string) => void;
  period?: "quarter" | "year";
  /** Arrow keys step the timeline from anywhere on the page (as on gigainvestors.com). */
  globalKeys?: boolean;
  source?: '13f';
}

// Timeline along the bottom. The quarter pill IS the thumb; drag it, click the track,
// use the ‹ › buttons or arrow keys.
export function QuarterSlider({ quarters, q, onChange, note, period = "quarter", embedded = false, label = "Quarter", onPrefetch, globalKeys = !embedded, source }: Props) {
  const [draft,setDraft]=useState<string|null>(null);
  useEffect(()=>setDraft(null),[q]);
  const shownQuarter=draft??q;
  const idx = Math.max(0, quarters.indexOf(shownQuarter));
  const change=(next:string,immediate=false)=>{
    setDraft(next);
    startTransition(()=>onChange(next,immediate));
  };
  const idxRef = useRef(idx);
  idxRef.current = idx;

  const step = (d: number) => {
    const n = idxRef.current + d;
    if (n >= 0 && n < quarters.length) {idxRef.current=n;change(quarters[n], true);}
  };

  useEffect(() => {
    if (!globalKeys) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLInputElement;
      if (t?.closest('dialog, [role="combobox"], [role="listbox"], textarea, [contenteditable="true"]') || (t?.tagName === "INPUT" && t.type !== "range")) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        step(e.key === "ArrowLeft" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quarters, onChange, globalKeys]);

  const pct = quarters.length > 1 ? (idx / (quarters.length - 1)) * 100 : 0;
  const q1s = quarters.filter((x) => period === "year" || x.endsWith("Q1"));
  const firstQ1Idx = q1s.length ? quarters.indexOf(q1s[0]) : quarters.length;
  const years = (firstQ1Idx >= 4 ? [quarters[0], ...q1s] : q1s).map((x) => ({ y: period === "year" ? x : x.slice(0, 4), i: quarters.indexOf(x) }));

  const track = useRef<HTMLDivElement>(null);
  const [trackWidth,setTrackWidth]=useState(0);
  useEffect(()=>{const el=track.current;if(!el)return;const observer=new ResizeObserver(()=>setTrackWidth(el.clientWidth));observer.observe(el);return()=>observer.disconnect();},[]);
  const lastEmit = useRef(0), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(q), dragging = useRef(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const emit = (value: string, immediate = false) => {
    latest.current = value;
    onPrefetch?.(value);
    if (timer.current) clearTimeout(timer.current);
    const delay = immediate ? 0 : Math.max(0, 80 - (performance.now() - lastEmit.current));
    const commit = () => { lastEmit.current = performance.now(); change(latest.current, immediate); };
    if (delay) timer.current = setTimeout(commit, delay); else commit();
  };
  const pointerValue = (clientX: number) => {
    const rect = track.current!.getBoundingClientRect();
    return quarters[Math.max(0, Math.min(quarters.length - 1, Math.round((clientX - rect.left) / rect.width * (quarters.length - 1))))];
  };
  const btn = "flex h-11 w-11 items-center justify-center text-[20px] leading-none transition-opacity sm:h-8 sm:w-8 sm:text-[15px]";

  return (
    <div className={embedded ? "house-timeline" : `timeline fixed inset-x-0 bottom-0 z-40 h-[84px] select-none bg-paper sm:h-12 ${period === "year" ? "year-timeline" : ""}`}>
      {!embedded && <div className="absolute bottom-[6px] left-[104px] z-10 text-[13px] leading-none opacity-55 sm:bottom-[3px] sm:left-5 sm:text-[13px] sm:opacity-40">
        {note && <span>{note} · </span>}
        <span className="hidden sm:inline">{period === "year" ? "Numerical tests only · " : "quarterly 13F filings · "}</span>
        <a href={period === "year" ? "https://eodhd.com" : "https://www.dataroma.com"} target="_blank" rel="noopener noreferrer" className="underline-offset-2 transition-opacity hover:opacity-100 hover:underline">
          {period === "year" ? "EODHD / filings" : "dataroma.com"}
        </a>
      </div>}
      <div className={embedded ? "house-steps" : "absolute bottom-1 left-1 flex items-center sm:bottom-2 sm:left-auto sm:right-2 sm:top-2"}>
        <div className="flex items-center">
          <button
            type="button"
            className={`${btn} ${idx === 0 ? "pointer-events-none opacity-15" : "opacity-45 hover:opacity-100"}`}
            onClick={() => step(-1)}
            aria-label={`Previous ${period}`} disabled={idx === 0}
            title={`previous ${period} (←)`}
          >
            ‹
          </button>
          <button
            type="button"
            className={`${btn} ${idx === quarters.length - 1 ? "pointer-events-none opacity-15" : "opacity-45 hover:opacity-100"}`}
            onClick={() => step(1)}
            aria-label={`Next ${period}`} disabled={idx === quarters.length - 1}
            title={`next ${period} (→)`}
          >
            ›
          </button>
        </div>
      </div>
      <div ref={track} className={embedded ? "house-track" : "relative ml-4 mr-4 h-12 sm:mr-[398px] sm:h-full"}>
        <input
          type="range"
          min={0}
          max={quarters.length - 1}
          value={idx}
          onChange={(e) => { if (!embedded || !dragging.current) emit(quarters[Number(e.target.value)], true); }}
          onPointerDown={e => { if (!embedded) return; e.preventDefault(); dragging.current = true; e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); emit(pointerValue(e.clientX), true); }}
          onPointerMove={e => { if (embedded && dragging.current) emit(pointerValue(e.clientX)); }}
          onPointerCancel={() => { dragging.current = false; emit(latest.current, true); }}
          onPointerUp={e => { if (embedded) { dragging.current = false; emit(pointerValue(e.clientX), true); } else e.currentTarget.blur(); }}
          title={embedded?note:undefined}
          aria-label={period === "year" ? "Fiscal year" : "Quarter"} aria-valuetext={shownQuarter === "Today" ? "Today" : period === "year" ? `Fiscal year ${shownQuarter}` : shownQuarter.replace(/^(\d{4})Q/, '$1 Q')}
          style={embedded ? {touchAction:"none"} : undefined}
          className="slider absolute inset-x-0 top-1 z-10 m-0 h-10 w-full cursor-ew-resize appearance-none bg-transparent"
        />
        <div className="pointer-events-none absolute top-[24px] h-px w-full bg-ink/30" />
        {embedded && period === "quarter" && quarters.map((quarter,i)=>quarter==='Today'?null:<i key={quarter} className="pointer-events-none absolute top-[23px] h-[3px] w-px bg-ink/30" style={{left:`${i/Math.max(1,quarters.length-1)*100}%`}}/>)}
        {(embedded && period === "year" ? quarters.map((y,i)=>({y,i})).filter(({y,i})=>y !== "Today" && (i % 5 === 0 || Number(y) % 5 === 0)) : years).map((y) => {
          const near = Math.abs(y.i-idx) / Math.max(1,quarters.length-1) * trackWidth < 72;
          return (
          <div key={y.y} className="pointer-events-none absolute top-[21px] h-[7px] w-px bg-ink/40" style={{ left: `${(y.i / Math.max(1, quarters.length - 1)) * 100}%` }}>
            {!near && (trackWidth / Math.max(1,years.length) >= 52 || Number(y.y) % 5 === 0) ? (
              <span className={`absolute -top-[13px] -translate-x-1/2 ${embedded ? "text-[13px]" : "text-[13px]"} leading-none opacity-45 ${embedded || Number(y.y) % 4 === 0 ? "inline" : "hidden"} sm:inline`} style={embedded&&y.i===0?{transform:"none"}:undefined}>{y.y}</span>
            ) : null}
          </div>
          );
        })}
        <div
          className="pointer-events-none absolute top-[24px] z-20 whitespace-nowrap rounded-[3px] bg-ink px-[7px] py-[4px] text-[13px] font-semibold leading-none text-paper shadow-[0_0_0_2px_var(--paper)]"
          style={{ left: `clamp(28px, ${pct}%, calc(100% - 28px))`, transform: "translate(-50%, -50%)" }}
        >
          {period === "year" && shownQuarter !== "Today" ? `FY${shownQuarter}` : shownQuarter.replace(/^(\d{4})Q/, '$1 Q')}
        </div>
        {embedded&&source==='13f'&&<small className="timeline-source"><span>quarterly 13F filings · </span><a href="https://www.dataroma.com" target="_blank" rel="noopener noreferrer">dataroma.com</a></small>}
      </div>
      <style>{`
        .slider::-webkit-slider-thumb{-webkit-appearance:none;width:56px;height:40px;background:transparent}
        .slider::-moz-range-thumb{width:56px;height:40px;background:transparent;border:0}
        .slider::-webkit-slider-runnable-track{background:transparent}
        .slider::-moz-range-track{background:transparent}
        .slider:focus-visible{outline:none!important}
        .slider:focus-visible ~ div:last-of-type{outline:2px solid var(--ink);outline-offset:3px}
      `}</style>
    </div>
  );
}
