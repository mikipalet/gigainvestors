import type { SearchIndex } from "../types";
import {buildCompanyIndex, type SearchCompany} from "./companies";

export type Hit =
  | { kind: "investor"; code: string; title: string; sub: string }
  | { kind: "stock"; ticker: string; title: string; sub: string; holders: number; logo?: string | null }
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
const prepared=new WeakMap<object,{normalize:(text:string)=>string;items:Prepared<unknown>[];buckets:Map<string,Prepared<unknown>[]>} >();
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
    const rows=items.map(item=>({item,fields:[...item.fields,...(item.aliases??[]).map(text=>({text,weight:1}))].map(field=>{const text=normalize(field.text);return {text,words:text.split(/\s+/),weight:field.weight??1};})}));
    // Build once, before typing: a substring can only match rows containing
    // its first one/two characters. Preserve input order inside each bucket.
    const buckets=new Map<string,Prepared<unknown>[]>();
    for(const row of rows){
      const keys=new Set<string>();
      for(const {text} of row.fields)for(let i=0;i<text.length;i++){keys.add(text[i]);if(i+1<text.length)keys.add(text.slice(i,i+2));}
      for(const key of keys){const bucket=buckets.get(key);if(bucket)bucket.push(row);else buckets.set(key,[row]);}
    }
    cached={normalize,items:rows,buckets};
    prepared.set(items,cached);
  }
  const score = ({text:t,words}:{text:string;words:string[]}) => {
    const offset=t.indexOf(qn);
    if(offset<0)return 0;
    if (t === qn) return 3;
    if (offset===0) return 2;
    if (words.some((w) => w.startsWith(qn))) return 1.5;
    return 1;
  };
  const limit=options.limit??12;
  if(limit<=0)return [];
  type Scored={item:RankItem<T>;s:number};
  const top:Scored[]=[];
  const compare=(a:Scored,b:Scored)=>b.s-a.s||(options.marketCapTiebreak?(b.item.marketCap??0)-(a.item.marketCap??0):0);
  // Keep only the visible candidates, preserving input order for equal scores.
  // Avoid allocating and sorting a result for every company on each keystroke.
  for(const {item,fields} of (cached.buckets.get(qn.slice(0,2))??[]) as Prepared<T>[]){
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
  const stocks = index.stocks.some(st => "aliases" in st) ? index.stocks as SearchCompany[] : buildCompanyIndex(index).stocks;
  for (const st of stocks) {
    items.push({ value: { kind: "stock", ticker: st.t, title: st.t, sub: st.n, holders: st.h, logo:st.lg??null },
      fields: [...[...new Set([st.t,...(st.aliases??[])])].map(text=>({text,weight:1.1})), ...[...new Set([st.n,...(st.names??[])])].map(text=>({text}))], marketCap:st.mc, bonus: Math.min(st.h, 40) / 200 });
  }
  palettes.set(index,items);
  }
  const result=rankItems(items,query,{marketCapTiebreak:true});
  return "charlie munger".includes(qn)&&qn.length>=3?[{kind:'munger'},...result].slice(0,12) as Hit[]:result;
}

/** Value companies have their own index; only investor/firm hits use the portfolio index. */
export function searchIndexForScope(index:SearchIndex,value:boolean):SearchIndex {
 return value?{investors:index.investors,stocks:[]}:index;
}
