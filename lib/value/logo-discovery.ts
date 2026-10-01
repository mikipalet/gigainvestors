import {Parser} from 'htmlparser2';
import {matchLogoRows,websiteUrl,type LogoBinding} from './logo-sources';
import type {Company} from './types';
export interface BrandCandidate {url:string;inline?:string;bytes?:Uint8Array;symbol?:string;crop?:{left:number;top:number;width:number;height:number};source:string;page:string}
export interface LogoAttempt {source:string;url?:string;outcome:string}
const escape=(s:string)=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
/** Header/nav brands, including inline SVGs. Never harvest arbitrary customer logos. */
export function brandCandidates(html:string,base:string,companyName:string):BrandCandidate[]{
 const result:BrandCandidate[]=[];
 const stack:{tag:string;logo:boolean;header:boolean;home:boolean;excluded:boolean}[]=[];
 let svgStart:number|null=null,svgDepth=0;
 const tokens=companyName.toLowerCase().split(/\W+/).filter(t=>t.length>3&&!['company','limited','holdings','group','corporation','international'].includes(t));
 const p=new Parser({onopentag(tag,a){
  const context=[a.alt,a.class,a.id,a.src,a['aria-label']].join(' '),parent=stack.at(-1);
  const excluded=!!parent?.excluded||/partner|customer|product|loading|loader|close|toggle|social|linkedin|youtube|facebook|twitter|instagram|weixin|wechat|qrcode|qr-code|flag|pagetop|back.to.top|arrow|banner|bnr_|bocweb/i.test(context);
  let home=false;
  if(tag==='a'&&a.href)try{const u=new URL(a.href,base);home=u.origin===new URL(base).origin&&(u.pathname===new URL(base).pathname&&!u.hash||/^\/(?:(?:[a-z]{2}(?:-[a-z]{2})?|english|eng|kor)\/?)?(?:(?:index|home|default)\.(?:html?|aspx?|php))?$/i.test(u.pathname));}catch{}
  const header=tag==='header'||tag==='nav'||/^(?:header|masthead|navbar|head-logo)/i.test(a.id??a.class??'')||!!parent?.header;
  const ownLogo=/logo|brand/i.test(context)||tokens.some(t=>context.toLowerCase().includes(t));
  const logoContainer=/logo/i.test([a.class,a.id,a['aria-label']].join(' '))&&header;
  stack.push({tag,logo:logoContainer||!!parent?.logo,header,home:home||!!parent?.home,excluded});
  if(svgStart!==null){svgDepth++;return;}
  if(tag==='svg'&&!excluded&&(header||home||parent?.home)&&(ownLogo||parent?.logo)) {svgStart=p.startIndex;svgDepth=1;}
  if(tag==='img'&&!excluded&&(ownLogo||(header&&parent?.logo))&&(header||home||parent?.home)){
   const src=[a['data-src'],a.src,a['data-original'],a.srcset?.split(/[ ,]/)[0]].find(s=>s&&!s.startsWith('data:'));
   if(src)try{const url=new URL(src,base).href;if(websiteUrl(url))result.push({url,source:'official-header',page:base});}catch{}
  }
 },onclosetag(){
  if(svgStart!==null&&--svgDepth===0){
   let inline=html.slice(svgStart,p.endIndex+1).replace(/^<svg\b(?![^>]*\bxmlns=)/i,'<svg xmlns="http://www.w3.org/2000/svg"');
   const use=inline.match(/<use\b[^>]*(?:xlink:)?href=["']([^"']+)#([^"']+)["']/i),local=inline.match(/<use\b[^>]*(?:xlink:)?href=["']#([^"']+)["']/i);
   if(use)result.push({url:new URL(use[1],base).href+'#'+use[2],symbol:use[2],source:'official-svg-symbol',page:base});
   else {if(local)inline=svgSymbol(html,local[1])??inline;result.push({url:base+'#inline-logo-'+result.length,inline,source:'official-inline-svg',page:base});}
   svgStart=null;
  }
  stack.pop();
 }},{decodeEntities:true});p.write(html);p.end();
 return result.sort((a,b)=>Number(!/\.svg(?:\?|$)|#inline/.test(a.url))-Number(!/\.svg(?:\?|$)|#inline/.test(b.url)));
}
export function localLogoFiles(wikitext:string):string[]{
 return [...wikitext.matchAll(/\|\s*(?:(?:company_)?logo(?:_image)?|logotipo|ロゴ|标志|標誌|公司标志|公司標誌|로고|लोगो|логотип)\s*=\s*([^\n]+)/gi)].flatMap(m=>{
  const file=m[1].replace(/^\[\[(?:File|Image|ファイル|文件|檔案|파일):/i,'').split('|')[0].replace(/\]\].*$/,'').trim();
  return /\.(svg|png|jpe?g|webp|gif)$/i.test(file)?[file]:[];
 });
}
/** RFC 9309 matching: most specific user agent, longest path match, allow wins ties. */
export function robotsAllowed(text:string,url:string):boolean{
 const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];let group:typeof groups[number]|undefined,hasRules=false;
 for(const raw of text.split(/\r?\n/)){const line=raw.replace(/#.*/,'').trim();const m=line.match(/^([^:]+):\s*(.*)$/);if(!m)continue;
  const key=m[1].toLowerCase(),value=m[2].trim();
  if(key==='user-agent'){if(!group||hasRules){group={agents:[],rules:[]};groups.push(group);hasRules=false;}group.agents.push(value.toLowerCase());}
  else if(group&&['allow','disallow'].includes(key)){hasRules=true;if(value)group.rules.push({allow:key==='allow',path:value});}
 }
 const own=groups.filter(g=>g.agents.some(a=>a!=='*'&&'gigainvestorslogobot'.includes(a))),selected=own.length?own:groups.filter(g=>g.agents.includes('*'));
 const u=new URL(url),path=u.pathname+u.search;
 const rules=selected.flatMap(g=>g.rules).filter(r=>new RegExp('^'+r.path.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\$(?!$)/g,'\\$')).test(path)).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return rules[0]?.allow??true;
}
export function robotsRequest(request:typeof fetch,attempts:LogoAttempt[]):typeof fetch{
 const cache=new Map<string,Promise<string|null>>();
 return async(input,init)=>{
  let url=String(input);
  for(let hop=0;hop<6;hop++){
  if(!websiteUrl(url))throw Error('Unsafe logo URL');const origin=new URL(url).origin;
  if(!cache.has(origin))cache.set(origin,(async()=>{try{const r=await request(origin+'/robots.txt');if(r.ok)return await r.text();if(r.status>=400&&r.status<500&&r.status!==429)return '';await r.body?.cancel();return null;}catch{return null;}})());
  const rules=await cache.get(origin)!;
  if(rules===null||!robotsAllowed(rules,url)){attempts.push({source:'robots',url,outcome:rules===null?'robots unavailable; deferred':'disallowed'});throw Error('robots disallowed or unavailable');}
  const response=await request(url,{...init,redirect:'manual'});
  if([301,302,303,307,308].includes(response.status)&&response.headers.get('location')){url=new URL(response.headers.get('location')!,url).href;await response.body?.cancel();continue;}
  if(!response.url)Object.defineProperty(response,'url',{value:url});return response;
  }throw Error('Too many logo redirects');
 };
}
export function relatedPages(html:string,base:string):string[]{
 const result:string[]=[];const p=new Parser({onopentag(tag,a){if(tag!=='a'||!a.href||!/(?:english|日本語|中文|한국어|investor|\/ir\b|\/en\b|\/eng\b|\/ja\b|\/cn\b|\/zh\b|\/ko\b|home|index\.)/i.test(a.href+' '+(a.hreflang??'')+' '+(a.title??'')))return;try{const u=new URL(a.href,base);if(u.hostname.replace(/^www\./,'')===new URL(base).hostname.replace(/^www\./,'')&&!/\.(?:pdf|zip|jpg|png)$/i.test(u.pathname)){u.hash='';result.push(u.href);}}catch{}}});p.write(html);p.end();return [...new Set(result)].filter(u=>u!==base).slice(0,5);
}
export async function* officialBrands(company:Company,sites:string[],request:typeof fetch,attempts:LogoAttempt[]):AsyncGenerator<BrandCandidate>{
 const queue=[...new Set(sites.flatMap(s=>{const u=websiteUrl(s);return u?[u]:[]}))],seen=new Set<string>();const fetchSite=robotsRequest(request,attempts);
 while(queue.length&&seen.size<8){const url=queue.shift()!;if(seen.has(url))continue;seen.add(url);
  try{const r=await fetchSite(url);if(!r.ok){attempts.push({source:'official-page',url,outcome:'HTTP '+r.status});continue;}const html=await r.text(),base=r.url||url;
   const candidates=brandCandidates(html,base,[company.name,company.nativeName,company.nameLocal].filter(Boolean).join(' '));attempts.push({source:'official-page',url:base,outcome:`${candidates.length} brand candidates`});
   for(const c of candidates)yield c;
   const sheets=[...html.matchAll(/<link[^>]+href=["']([^"']+\.css(?:\?[^"']*)?)["']/gi)].map(m=>new URL(m[1],base).href).slice(0,8);
   const seenSheets=new Set<string>();
   while(sheets.length&&seenSheets.size<8){const cssUrl=sheets.shift()!;if(seenSheets.has(cssUrl))continue;seenSheets.add(cssUrl);try{const css=await fetchSite(cssUrl);if(!css.ok)continue;const text=await css.text();for(const c of cssBrandCandidates(text,cssUrl,base))yield c;for(const m of text.matchAll(/@import\s+(?:url\(\s*)?["']?([^"'\s);]+\.css(?:\?[^"'\s);]*)?)/gi))sheets.push(new URL(m[1],cssUrl).href);}catch{}}
   queue.push(...relatedPages(html,base));
  }catch(e){attempts.push({source:'official-page',url,outcome:String(e).slice(0,180)});}
 }
}
const localLanguages=['ja','ko','zh','de','fr','it','es','sv','nl','pt','hi','en'];
/** Map exact issuer identities to sitelinks, then use only explicit infobox logos. */
export async function* wikipediaBrands(company:Company,rows:LogoBinding[],site:string|undefined,request:typeof fetch,attempts:LogoAttempt[],reviewedTitle?:string):AsyncGenerator<BrandCandidate>{
 let matches=matchLogoRows(company,rows,site);
 if(!matches.length)matches=await discoverWikiIdentity(company,site,request,attempts);
 let item=matches[0]?.item?.value.split('/').at(-1);
 if(!item&&reviewedTitle)try{const [language,title]=/^[a-z]{2}:/.test(reviewedTitle)?[reviewedTitle.slice(0,2),reviewedTitle.slice(3)]:['en',reviewedTitle];const r=await request('https://'+language+'.wikipedia.org/w/api.php?action=query&prop=pageprops&redirects=1&format=json&titles='+encodeURIComponent(title));if(r.ok){const pages=Object.values((await r.json()).query?.pages??{}) as {pageprops?:{wikibase_item?:string}}[];item=pages[0]?.pageprops?.wikibase_item;attempts.push({source:'wikidata-reviewed-identity',url:'https://'+language+'.wikipedia.org/wiki/'+encodeURIComponent(title),outcome:item?'reviewed issuer page maps to '+item:'no Wikidata page identity'});}}catch(e){attempts.push({source:'wikidata-reviewed-identity',outcome:String(e)});}
 if(!item){attempts.push({source:'wikipedia-local',outcome:'no unambiguous Wikidata identity'});return;}
 try{
  const r=await request(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${item}&props=sitelinks&format=json`);if(!r.ok)throw Error('HTTP '+r.status);
  const links=(await r.json()).entities?.[item]?.sitelinks??{};
  const first:Record<string,string>={JP:'ja',KR:'ko',CN:'zh',TW:'zh',HK:'zh',DE:'de',FR:'fr',IT:'it',ES:'es',SE:'sv',NL:'nl',BR:'pt',IN:'hi'};
  for(const lang of [...new Set([first[company.country],...localLanguages].filter(Boolean))]){
   const title=links[lang+'wiki']?.title;if(!title)continue;
   const api=`https://${lang}.wikipedia.org/w/api.php`,page=`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
   try{const p=await request(api+'?action=parse&prop=wikitext&format=json&page='+encodeURIComponent(title));if(!p.ok)throw Error('HTTP '+p.status);
    const files=localLogoFiles((await p.json()).parse?.wikitext?.['*']??'');
    if(!files.length){const image=await request(api+'?action=query&prop=pageimages&piprop=name%7Coriginal&format=json&titles='+encodeURIComponent(title));if(image.ok){const pages=Object.values((await image.json()).query?.pages??{}) as {pageimage?:string;original?:{source:string}}[];for(const p of pages)if(p.pageimage&&/logo|logotype|ロゴ|標誌|标志|로고/i.test(p.pageimage)&&p.original?.source)yield {url:p.original.source,source:'wikipedia-'+lang,page};}}
    attempts.push({source:'wikipedia-local',url:page,outcome:`${files.length} infobox logo files`});
    for(const file of files){const info=await request(api+'?action=query&prop=imageinfo&iiprop=url&format=json&titles='+encodeURIComponent('File:'+file));if(!info.ok)continue;const data=await info.json();for(const image of Object.values(data.query?.pages??{}) as {imageinfo?:{url:string}[]}[]){const url=image.imageinfo?.[0]?.url;if(url)yield {url,source:'wikipedia-'+lang,page};}}
   }catch(e){attempts.push({source:'wikipedia-local',url:page,outcome:String(e)});}
  }
 }catch(e){attempts.push({source:'wikipedia-local',url:item,outcome:String(e)});}
}

export function cssBrandCandidates(css:string,base:string,page:string):BrandCandidate[]{
 const result:BrandCandidate[]=[];
 for(const rule of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)){
  if(!/logo|header[^,{]*(?:title|brand|h1)|masthead/i.test(rule[1])||/footer|partner|customer|client|sns|social|product|brand[_-]?(?:list|item)|youtube|linkedin|flag/i.test(rule[1]))continue;
  for(const m of rule[2].matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g))try{const url=new URL(m[1],base).href;if(websiteUrl(url)&&!url.endsWith('.woff'))result.push({url,page,source:'official-css-logo'});}catch{}
 }return result;
}

/** Search is discovery only: require an exact identifier, exchange ticker, or official host. */
export async function discoverWikiIdentity(company:Company,site:string|undefined,request:typeof fetch,attempts:LogoAttempt[]):Promise<LogoBinding[]>{
 try{
  const query=company.name.replace(/\b(?:Co\.?|Ltd\.?|Inc\.?|Corporation|Corp\.?)\b/gi,'').replace(/[, .]+$/,'').trim();
  const search=await request('https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&limit=5&search='+encodeURIComponent(query));
  if(!search.ok)throw Error('search HTTP '+search.status);let hits=(await search.json()).search??[];if(!hits.length&&query.split(/\s+/).length>2){const r=await request('https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&limit=5&search='+encodeURIComponent(query.split(/\s+/).slice(0,2).join(' ')));if(r.ok)hits=(await r.json()).search??[];}const ids=hits.map((r:{id:string})=>r.id).filter((id:string)=>/^Q\d+$/.test(id));
  if(!ids.length){attempts.push({source:'wikidata-identity',outcome:'name search returned no entities'});return [];}
  const response=await request('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids='+ids.join('|'));if(!response.ok)throw Error('entities HTTP '+response.status);
  const entities=(await response.json()).entities??{},rows:LogoBinding[]=[];
  for(const [id,entity] of Object.entries(entities) as [string,{claims?:Record<string,any[]>}][]){
   const claims=entity.claims??{},item={value:'http://www.wikidata.org/entity/'+id};
   const values=(key:string)=>(claims[key]??[]).map(c=>c.mainsnak?.datavalue?.value).filter(Boolean);
   const websites=values('P856');
   for(const website of websites)rows.push({item,website:{value:website}});
   for(const isin of values('P946'))rows.push({item,isin:{value:isin},...(websites[0]?{website:{value:websites[0]}}:{})});
   for(const lei of values('P1278'))rows.push({item,lei:{value:lei},...(websites[0]?{website:{value:websites[0]}}:{})});
   for(const listing of claims.P414??[])for(const code of listing.qualifiers?.P249??[]){const exchange=listing.mainsnak?.datavalue?.value?.id,ticker=code.datavalue?.value;if(exchange&&ticker)rows.push({item,exchange:{value:'http://www.wikidata.org/entity/'+exchange},ticker:{value:ticker},...(websites[0]?{website:{value:websites[0]}}:{})});}
  }
  const matched=matchLogoRows(company,rows,site);attempts.push({source:'wikidata-identity',outcome:matched.length?'exact identity found: '+matched[0].item.value:'search results lacked unambiguous identifier or official host'});return matched;
 }catch(e){attempts.push({source:'wikidata-identity',outcome:String(e)});return [];}
}

export function svgSymbol(text:string,id:string):string|null{
 if(!/^[\w:.-]+$/.test(id))return null;
 const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const symbol=text.match(new RegExp('<symbol\\b([^>]*\\bid=["\']'+escaped+'["\'][^>]*)>([\\s\\S]*?)</symbol>','i'));
 if(!symbol)return null;
 const view=symbol[1].match(/viewBox=["']([^"']+)["']/i)?.[1];if(!view)return null;
 const defs=text.match(/<defs\b[^>]*>[\s\S]*?<\/defs>/i)?.[0]??'';
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${escape(view)}">${defs}${symbol[2]}</svg>`;
}
