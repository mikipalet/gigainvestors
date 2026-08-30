"use client";

import { useCallback, useState } from "react";

export function useQuarter(quarters: string[], initial: string | undefined) {
  const [q, setQ] = useState(() => (initial && quarters.includes(initial) ? initial : quarters[quarters.length - 1]));
  const change = useCallback((next: string) => {
    setQ(next);
    const url = new URL(window.location.href);
    url.searchParams.set("q", next);
    window.history.replaceState(null, "", url);
  }, []);
  return [q, change] as const;
}
