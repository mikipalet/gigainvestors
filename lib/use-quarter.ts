"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useQuarter(quarters: string[], fallback?: string) {
  const [q, setQ] = useState(fallback ?? quarters[quarters.length - 1]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("q");
    if (fromUrl && quarters.includes(fromUrl)) setQ(fromUrl);
  }, [quarters]);

  // Dragging the timeline changes the quarter many times a second. WebKit rate-limits
  // history writes hard, so the URL is only rewritten once the drag settles.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const change = useCallback((next: string) => {
    setQ(next);
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("q", next);
      window.history.replaceState(null, "", url);
    }, 350);
  }, []);

  useEffect(() => () => { if (pending.current) clearTimeout(pending.current); }, []);

  return [q, change] as const;
}
