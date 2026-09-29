'use client';
import { fetchValueData, validQuote } from '@/lib/value/data-source';
import { useEffect, useState } from 'react';
import type { PriceMap } from '@/lib/value/types';

export function useQuote(id: string, country: string): PriceMap[string] | null {
  const [loaded, setLoaded] = useState<{ id: string; quote: PriceMap[string] | null } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchValueData<PriceMap>(`prices/${country}.json`, controller.signal)
      .then(prices => {
        setLoaded({ id, quote: validQuote(prices[id]) });
      }).catch(() => { if (!controller.signal.aborted) setLoaded({ id, quote: null }); });
    return () => controller.abort();
  }, [id, country]);
  return loaded?.id === id ? loaded.quote : null;
}
