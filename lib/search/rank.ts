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
const lowercase=(text:string)=>text.toLowerCase();
type Prepared<T>={item:RankItem<T>;fields:Array<{text:string;words:string[];weight:number}>};
const prepared=new WeakMap<object,{normalize:(text:string)=>string;items:Prepared<unknown>[]} >();
const palettes=new WeakMap<SearchIndex,RankItem<Hit>[]>();

/** One scoring implementation for both sources. Defaults preserve palette behavior. */
export function rankItems<T>(items: RankItem<T>[], query: string, options: {
  normalize?: (text: string) => string;
  marketCapTiebreak?: boolean;
  limit?: number;
} = {}): T[] {
  const normalize = options.normalize ?? lowercase;
  const qn = normalize(query.trim());
  if (!qn) return [];
  let cached=prepared.get(items);
  if(!cached||cached.normalize!==normalize){
    cached={normalize,items:items.map(item=>({item,fields:[...item.fields,...(item.aliases??[]).map(text=>({text,weight:1}))].map(field=>{const text=normalize(field.text);return {text,words:text.split(/\s+/),weight:field.weight??1};})}))};
    prepared.set(items,cached);
  }
  const score = ({text:t,words}:{text:string;words:string[]}) => {
    if (t === qn) return 3;
    if (t.startsWith(qn)) return 2;
    if (words.some((w) => w.startsWith(qn))) return 1.5;
    if (t.includes(qn)) return 1;
    return 0;
  };
  const limit=options.limit??12;
  if(limit<=0)return [];
  type Scored={item:RankItem<T>;s:number};
  const top:Scored[]=[];
  const compare=(a:Scored,b:Scored)=>b.s-a.s||(options.marketCapTiebreak?(b.item.marketCap??0)-(a.item.marketCap??0):0);
  // Keep only the visible candidates, preserving input order for equal scores.
  // Avoid allocating and sorting a result for every company on each keystroke.
  for(const {item,fields} of cached.items as Prepared<T>[]){
    let s=0;
    for(const field of fields)s=Math.max(s,score(field)*field.weight);
    if(!s)continue;
    const hit={item,s:s+(item.bonus??0)};
    if(top.length===limit&&compare(hit,top[top.length-1])>=0)continue;
    const i=top.findIndex(other=>compare(hit,other)<0);
    top.splice(i<0?top.length:i,0,hit);
    if(top.length>limit)top.pop();
  }
  return top.map(hit=>hit.item.value);
}

export function rank(index: SearchIndex, query: string): Hit[] {
  const qn = query.trim().toLowerCase();
  if (!qn) return [];
  let items=palettes.get(index);
  if(!items){
  items=[];
  for (const i of index.investors) {
    items.push({ value: { kind: "investor", code: i.code, title: i.person, sub: i.firm },
      fields: [{ text: i.person }, { text: i.firm, weight: 0.9 }, { text: i.code, weight: 0.8 }], bonus: 0.05 });
  }
  for (const st of index.stocks) {
    items.push({ value: { kind: "stock", ticker: st.t, title: st.t, sub: st.n, holders: st.h },
      fields: [{ text: st.t, weight: 1.1 }, { text: st.n }], bonus: Math.min(st.h, 40) / 200 });
  }
  palettes.set(index,items);
  }
  const result=rankItems(items,query);
  return "charlie munger".includes(qn)&&qn.length>=3?[{kind:'munger'},...result].slice(0,12) as Hit[]:result;
}
