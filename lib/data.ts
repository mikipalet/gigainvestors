import { head } from "@vercel/blob";
import type { Index, InvestorData } from "./types";

async function readCached<T>(key: string): Promise<T | null> {
  try {
    const meta = await head(key);
    const res = await fetch(meta.url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getIndex = () => readCached<Index>("index.json");
export const getInvestor = (code: string) => readCached<InvestorData>(`investors/${code}.json`);
