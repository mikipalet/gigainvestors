import type { SearchIndex } from "../types";

export type Hit =
  | { kind: "investor"; code: string; title: string; sub: string }
  | { kind: "stock"; ticker: string; title: string; sub: string; holders: number }
  | { kind: "munger" };

export interface RankItem<T> {
  value: T;
  fields: Array<{ text: string; weight?: number }>;
  aliases?: string[];
  bonus?: number;
  marketCap?: number | null;
}

/** One scoring implementation for both sources. Defaults preserve palette behavior. */
export function rankItems<T>(items: RankItem<T>[], query: string, options: {
  normalize?: (text: string) => string;
  marketCapTiebreak?: boolean;
  limit?: number;
} = {}): T[] {
  const normalize = options.normalize ?? ((text: string) => text.toLowerCase());
  const qn = normalize(query.trim());
  if (!qn) return [];
  const score = (s: string) => {
    const t = normalize(s);
    if (t === qn) return 3;
    if (t.startsWith(qn)) return 2;
    if (t.split(/\s+/).some((w) => w.startsWith(qn))) return 1.5;
    if (t.includes(qn)) return 1;
    return 0;
  };
  return items.map(item => {
    const s = Math.max(0, ...item.fields.map(field => score(field.text) * (field.weight ?? 1)),
      ...(item.aliases ?? []).map(alias => score(alias)));
    return { item, s: s ? s + (item.bonus ?? 0) : 0 };
  }).filter(hit => hit.s > 0)
    .sort((a, b) => b.s - a.s || (options.marketCapTiebreak
      ? (b.item.marketCap ?? 0) - (a.item.marketCap ?? 0) : 0))
    .slice(0, options.limit ?? 12).map(hit => hit.item.value);
}

export function rank(index: SearchIndex, query: string): Hit[] {
  const qn = query.trim().toLowerCase();
  if (!qn) return [];
  const items: RankItem<Hit>[] = [];
  if ("charlie munger".includes(qn) && qn.length >= 3) {
    items.push({ value: { kind: "munger" }, fields: [{ text: qn }], bonus: 1 });
  }
  for (const i of index.investors) {
    items.push({ value: { kind: "investor", code: i.code, title: i.person, sub: i.firm },
      fields: [{ text: i.person }, { text: i.firm, weight: 0.9 }, { text: i.code, weight: 0.8 }], bonus: 0.05 });
  }
  for (const st of index.stocks) {
    items.push({ value: { kind: "stock", ticker: st.t, title: st.t, sub: st.n, holders: st.h },
      fields: [{ text: st.t, weight: 1.1 }, { text: st.n }], bonus: Math.min(st.h, 40) / 200 });
  }
  return rankItems(items, query);
}
