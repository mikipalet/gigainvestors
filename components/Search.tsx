"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchIndex } from "@/lib/types";
import { plural } from "@/lib/format";
import { slugOf } from "@/lib/slug";

import { rank, type Hit } from "@/lib/search/rank";

let cached: Promise<SearchIndex> | null = null;
const loadIndex = () => (cached ??= fetch("/api/search").then((r) => r.json() as Promise<SearchIndex>));

// Press "/" anywhere. Investors, firms, tickers and company names.
export function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLInputElement;
      const typing = t?.tagName === "INPUT" && t.type !== "range";
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadIndex().then(setIndex);
    setQuery("");
    setSel(0);
    requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  const hits = useMemo(() => (index ? rank(index, query) : []), [index, query]);

  const go = (h: Hit) => {
    setOpen(false);
    window.location.assign(h.kind === "munger" ? "/munger" : h.kind === "investor" ? `/${h.code}` : `/s/${encodeURIComponent(h.ticker)}`);
  };

  return (
    <>
      <div className="fixed bottom-[6px] right-2 z-50 flex items-center gap-1 sm:bottom-[9px] sm:right-[76px] sm:gap-2">
        <a
          href="mailto:hello@gigainvestors.com"
          className="hidden rounded-[3px] px-2 py-1 text-[12px] leading-none opacity-50 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_35%,transparent)] transition-opacity hover:opacity-100 sm:block"
        >
          contact
        </a>
        <a
          href="/newsletter"
          className="flex h-11 w-11 items-center justify-center rounded-[3px] bg-paper text-[17px] leading-none opacity-75 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_35%,transparent)] transition-opacity hover:opacity-100 sm:h-auto sm:w-auto sm:px-2 sm:py-1 sm:text-[12px] sm:opacity-50"
        >
          <span className="sm:hidden">✉</span>
          <span className="hidden sm:inline">newsletter</span>
        </a>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          className="flex h-11 w-11 items-center justify-center rounded-[3px] bg-paper text-[17px] leading-none opacity-75 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_35%,transparent)] transition-opacity hover:opacity-100 sm:h-auto sm:w-auto sm:px-2 sm:py-1 sm:text-[12px] sm:opacity-50"
        >
          <span className="sm:hidden">⌕</span>
          <span className="hidden sm:inline">
            search <span className="ml-1 opacity-60">/</span>
          </span>
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-paper/85 pt-[18vh] backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
          <div className="w-[min(560px,92vw)] bg-paper shadow-[0_0_0_1px_var(--ink)]" onMouseDown={(e) => e.stopPropagation()}>
            <input
              ref={input}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSel(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") setSel((s) => Math.min(s + 1, hits.length - 1));
                if (e.key === "ArrowUp") setSel((s) => Math.max(s - 1, 0));
                if (e.key === "Enter" && hits[sel]) go(hits[sel]);
              }}
              placeholder="investor, firm, ticker, company"
              className="w-full bg-transparent px-4 py-3 text-[16px] outline-none placeholder:opacity-35"
              spellCheck={false}
              autoComplete="off"
            />
            {!query.trim() && (
              <div className="border-t border-ink/15 px-4 py-3 text-[12px] leading-relaxed opacity-45">
                Try an investor (Buffett, Ackman), a firm (Baupost), or a ticker (AAPL, GOOGL).
              </div>
            )}
            {hits.length === 0 && query.trim().length > 1 && index && (
              <div className="border-t border-ink/15 px-4 py-3 text-[13px] opacity-40">nothing filed under that</div>
            )}
            {hits.length > 0 && (
              <ul className="max-h-[50vh] overflow-y-auto border-t border-ink/15 py-1">
                {hits.map((h, i) => (
                  <li
                    key={h.kind === "munger" ? "munger" : h.kind === "investor" ? `i${h.code}` : `s${h.ticker}`}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(h)}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-[13px] ${i === sel ? "bg-ink text-paper" : ""}`}
                  >
                    {h.kind === "investor" && <img src={`/faces/png/v2/${slugOf(h.title)}.png`} width={26} height={32} alt="" className="-my-1 block shrink-0" />}
                    <span className="shrink-0 whitespace-nowrap font-semibold">{h.kind === "munger" ? "Charlie Munger" : h.title}</span>
                    <span className="truncate opacity-60">{h.kind === "munger" ? "1924 – 2023" : h.sub}</span>
                    {h.kind === "stock" && <span className="ml-auto shrink-0 opacity-60">{plural(h.holders, "holder")}</span>}
                    {h.kind === "investor" && <span className="ml-auto shrink-0 opacity-60">investor</span>}
                    {h.kind === "munger" && <span className="ml-auto shrink-0 opacity-60">the waiting</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
