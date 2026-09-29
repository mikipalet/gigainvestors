'use client';
import { useEffect, useState } from 'react';
import type { PriceMap } from '@/lib/value/types';

export function useQuote(id: string, country: string): PriceMap[string] | null {
  const [loaded, setLoaded] = useState<{ id: string; quote: PriceMap[string] | null } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/prices/${country}.json`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Quote unavailable');
        const prices: PriceMap = await response.json();
        const quote = prices[id];
        setLoaded({ id, quote: Array.isArray(quote) && Number.isFinite(quote[0]) && quote[0] > 0 && typeof quote[1] === 'string' ? quote : null });
      }).catch(() => { if (!controller.signal.aborted) setLoaded({ id, quote: null }); });
    return () => controller.abort();
  }, [id, country]);
  return loaded?.id === id ? loaded.quote : null;
}
