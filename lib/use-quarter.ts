"use client";

import { useCallback, useEffect, useState } from "react";

export function useQuarter(quarters: string[], fallback?: string) {
  const [q, setQ] = useState(fallback ?? quarters[quarters.length - 1]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("q");
    if (fromUrl && quarters.includes(fromUrl)) setQ(fromUrl);
  }, [quarters]);

  const change = useCallback((next: string) => {
    setQ(next);
    const url = new URL(window.location.href);
    url.searchParams.set("q", next);
    window.history.replaceState(null, "", url);
  }, []);

  return [q, change] as const;
}
