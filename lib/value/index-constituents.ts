import type { Constituent } from './index-membership';
export interface TableSource { url: string; retrievedAt: string; revision?: string|number|null; tables: string[][][]; constituentList?: string[]; }
const suffixes:Record<string,string>={DE:'XETRA',L:'LSE',T:'JP',AX:'AU',SW:'SW',PA:'PA',AS:'AS',MI:'MI',MC:'MC',HE:'HE',ST:'ST',CO:'CO',OL:'OL',BR:'BR',LS:'LS',IR:'IR',HK:'HK',TO:'TO'};
const venues:Record<string,string>={Switzerland:'SW',Germany:'XETRA',France:'PA',Italy:'MI',Spain:'MC',Netherlands:'AS',Denmark:'CO',Finland:'HE',Sweden:'ST',Norway:'OL',Belgium:'BR',Portugal:'LS',Austria:'VI',Ireland:'IR','United Kingdom':'LSE',Poland:'WAR'};
/** Select constituent tables by identity columns, never historical additions/removals. */
export function parseConstituentTables(source:TableSource,exchange:string):Constituent[]{
 if(source.constituentList?.length)return source.constituentList.map(text=>{const m=/^(\d{4})\s+(.+)$/.exec(text);return m?{code:m[1],name:m[2],exchange}:{name:text.replace(/\[[^\]]+\]/g,'').trim(),exchange};});
 const results:Constituent[]=[];
 for(const original of source.tables){
  const table=original[0]?.filter(h=>h==='名稱').length===2 ? [original[0].slice(0,3),...original.slice(1).flatMap(r=>[r.slice(0,3),r.slice(3,6)])] : original;
  const header=table[0]??[];
  const name=header.findIndex(h=>/^(company(?: name)?|security|name|constituent|銘柄名|名稱|社名)$/i.test(h));
  if(name<0 || table.length<2 || header.some(h=>/period in|date.*removed/i.test(h)))continue;
  const code=header.findIndex(h=>/^(ticker(?: symbol)?|symbol|code|stock symbol|mnem code|コード|証券コード|股票代號)$/i.test(h));
  const isin=header.findIndex(h=>/^isin$/i.test(h));
  const country=header.findIndex(h=>/^country$/i.test(h));
  const venue=header.findIndex(h=>/^exchange$/i.test(h));
  const constituents=table.slice(1).filter(r=>r[name]&&r[name]!==header[name]&&!/^total$/i.test(r[name])).map(row=>{
   let ex=exchange || venues[row[country]] || (row[venue]==='Shanghai'?'SHG':row[venue]==='Shenzhen'?'SHE':'');
   let symbol=code<0?'':row[code]?.replace(/^.*?[:：]\s*/,'').trim()??'';
   const suffix=/\.([A-Z]+)$/.exec(symbol);
   if(suffix&&suffixes[suffix[1]]){ex=suffixes[suffix[1]];symbol=symbol.slice(0,-suffix[0].length);}
   if(ex==='HK')symbol=symbol.padStart(4,'0');
   if(ex==='KO')symbol=symbol.padStart(6,'0');
   return {name:row[name],...(symbol?{code:symbol}:{}),...(ex?{exchange:ex}:{}),...(isin>=0&&row[isin]?{isin:row[isin]}:{})};
  });
  results.push(...constituents);
  // Nikkei's official source splits the full index into sector tables.
  if(!source.url.includes('indexes.nikkei.co.jp'))break;
 }
 return results;
}
