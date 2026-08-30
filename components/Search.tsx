"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchIndex } from "@/lib/types";

type Hit = { kind: "investor"; code: string; title: string; sub: string } | { kind: "stock"; ticker: string; title: string; sub: string; holders: number };

let cached: Promise<SearchIndex> | null = null;
const loadIndex = () => (cached ??= fetch("/api/search").then((r) => r.json() as Promise<SearchIndex>));

function rank(index: SearchIndex, query: string): Hit[] {
  const qn = query.trim().toLowerCase();
  if (!qn) return [];
  const score = (s: string) => {
    const t = s.toLowerCase();
    if (t === qn) return 3;
    if (t.startsWith(qn)) return 2;
    if (t.split(/\s+/).some((w) => w.startsWith(qn))) return 1.5;
    if (t.includes(qn)) return 1;
    return 0;
  };
  const hits: { h: Hit; s: number }[] = [];
  for (const i of index.investors) {
    const s = Math.max(score(i.person), score(i.firm) * 0.9, score(i.code) * 0.8);
    if (s) hits.push({ h: { kind: "investor", code: i.code, title: i.person, sub: i.firm }, s: s + 0.05 });
  }
  for (const st of index.stocks) {
    const s = Math.max(score(st.t) * 1.1, score(st.n));
    if (s) hits.push({ h: { kind: "stock", ticker: st.t, title: st.t, sub: st.n, holders: st.h }, s: s + Math.min(st.h, 20) / 400 });
  }
  return hits.sort((a, b) => b.s - a.s).slice(0, 12).map((x) => x.h);
}

// Press "/" anywhere. Investors, firms, tickers and company names.
export function Search() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && !e.metaKey && !e.ctrlKey) {
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
    router.push(h.kind === "investor" ? `/${h.code}` : `/s/${encodeURIComponent(h.ticker)}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="fixed right-3 top-3 z-40 rounded-[3px] px-2 py-1 text-[12px] opacity-50 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_35%,transparent)] transition-opacity hover:opacity-100"
      >
        search <span className="ml-1 opacity-60">/</span>
      </button>
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
            {hits.length > 0 && (
              <ul className="max-h-[50vh] overflow-y-auto border-t border-ink/15 py-1">
                {hits.map((h, i) => (
                  <li
                    key={h.kind === "investor" ? `i${h.code}` : `s${h.ticker}`}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(h)}
                    className={`flex cursor-pointer items-baseline gap-3 px-4 py-2 text-[13px] ${i === sel ? "bg-ink text-paper" : ""}`}
                  >
                    <span className="w-[5.5em] shrink-0 font-semibold">{h.title}</span>
                    <span className="truncate opacity-60">{h.sub}</span>
                    {h.kind === "stock" && <span className="ml-auto shrink-0 opacity-60">{h.holders} holders</span>}
                    {h.kind === "investor" && <span className="ml-auto shrink-0 opacity-60">investor</span>}
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
