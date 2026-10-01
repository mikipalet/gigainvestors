import {Parser} from 'htmlparser2';
import sharp from 'sharp';
import type {Company} from './types';
import type {GeneralInfo} from './enrichment';
import {iconHash,logoPixels,validLogo} from './logo-validation';
export type LogoBinding=Record<string,{value:string}>;
export const LOGO_USER_AGENT='GigaInvestorsLogoBot/2.0 (https://github.com/mikipalet/gigainvestors; https://gigainvestors.com)';
const exchanges:Record<string,string[]>={US:['Q13677','Q82059','Q846626'],JP:['Q217475'],TSE:['Q217475'],LSE:['Q171240'],PA:['Q2385849'],AS:['Q478720'],MI:['Q936563','Q107228046'],XETRA:['Q819468','Q151139'],F:['Q151139'],SW:['Q661834'],TO:['Q818723'],AU:['Q732670'],HK:['Q496672'],TW:['Q548621'],KO:['Q495364'],KQ:['Q491503'],NSE:['Q638740'],BSE:['Q638398'],SHG:['Q739514'],SHE:['Q517750'],MC:['Q617426'],ST:['Q1019992'],CO:['Q1019983'],HE:['Q581755'],OL:['Q909158'],VI:['Q698535'],WAR:['Q59551'],JSE:['Q627514'],MX:['Q891559'],BR:['Q1146518'],LS:['Q2415561']};
export function websiteUrl(value?:string):string|null{
 try{const u=new URL(value?.includes('://')?value:`https://${value??''}`);if(!/^https?:$/.test(u.protocol)||u.username||u.password||!u.hostname.includes('.')||/^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname))return null;return u.href;}catch{return null;}
}
const domain=(value?:string)=>{const url=websiteUrl(value);return url?new URL(url).hostname.toLowerCase().replace(/^www\./,''):null;};
const ticker=(s?:string)=>s?.trim().toUpperCase().replace(/^0+(?=\d)/,'').replace(/\./g,'-');
export function matchLogoRows(company:Company,rows:LogoBinding[],website?:string):LogoBinding[]{
 const groups=[rows.filter(r=>company.isin&&r.isin?.value===company.isin),rows.filter(r=>company.lei&&r.lei?.value===company.lei),rows.filter(r=>ticker(r.ticker?.value)===ticker(company.code)&&(exchanges[company.exchange]??[]).some(q=>r.exchange?.value.endsWith('/'+q))),rows.filter(r=>domain(website)&&domain(r.website?.value)===domain(website))];
 const matches=groups.find(g=>g.length)??[];
 return new Set(matches.map(r=>r.item?.value)).size===1?matches:[];
}
export type IconCandidate={url:string;source:string;size:number;rank:number};
export function officialCandidates(html:string,base:string):IconCandidate[]{
 const result:IconCandidate[]=[];let homeLink=false,assetBase=base,hasBase=false,imageCount=0;
 const add=(href:string,source:string,rank:number,sizes='')=>{try{const url=new URL(href,assetBase).href;if(websiteUrl(url))result.push({url,source,rank,size:sizes==='any'?10000:Math.max(0,...[...sizes.matchAll(/(\d+)x\d+/g)].map(m=>Number(m[1])))});}catch{}};
 const parser=new Parser({onopentag(name,a){
  const rel=(a.rel??'').toLowerCase().split(/\s+/);
  if(name==='base'&&!hasBase&&a.href){try{const value=new URL(a.href,base).href;if(websiteUrl(value)){assetBase=value;hasBase=true;}}catch{}}
  if(name==='a'){try{const target=new URL(a.href??'',base);homeLink=Boolean(a.href&&!a.href.startsWith('#'))&&target.origin===new URL(base).origin&&(target.pathname.replace(/\/$/,'')===''||/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:index|default|home)\.(?:html?|aspx?|php)$/i.test(target.pathname)||target.pathname===new URL('index.html',assetBase).pathname);}catch{homeLink=false;}}
  if(name==='img')imageCount++;
  const landingLogo=imageCount===1&&(a.class??'').split(/\s+/).some(c=>/^(?:site|header|index|welcome)[-_]?logo$/i.test(c));
  if(name==='img'&&(homeLink||landingLogo)&&/logo|brand/i.test([a.alt,a.class,a.id,a.src].join(' '))){const src=a.src?.startsWith('data:')?a['data-src']:a.src;if(src)add(src,'official-logo',3);}
  if(name==='link'&&a.href){if(rel.some(r=>/^apple-touch-icon(?:-precomposed)?$/.test(r)))add(a.href,'official-icon',0,a.sizes);else if(rel.includes('icon'))add(a.href,'official-icon',1,a.sizes);else if(rel.includes('manifest'))add(a.href,'official-manifest',2);}
  if(name==='meta'&&(a.property??a.name)?.toLowerCase()==='og:image'&&a.content)add(a.content,'official-og',4);
 },onclosetag(name){if(name==='a')homeLink=false;}});parser.write(html);parser.end();
 return result.sort((a,b)=>a.rank-b.rank||b.size-a.size);
}
export function commonsUrl(value:string):string|null{
 try{const u=new URL(value);if(!['commons.wikimedia.org','commons.wikimedia.org.'].includes(u.hostname))return null;const name=decodeURIComponent(u.pathname.split('Special:FilePath/')[1]??'');if(!name)return null;return 'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(name)+(/\.svg$/i.test(name)?'':'?width=256');}catch{return null;}
}
export type ResolvedLogo={source:string|null;sourceUrl?:string;originalHash?:string;width?:number;height?:number;format?:string;wikidataItem?:string;website?:string;asset?:string;bytes?:Buffer;retryable?:boolean;failures?:string[]};
export async function resolveCompanyLogo(company:Company,general:GeneralInfo,rows:LogoBinding[],request:typeof fetch,hashes:Set<string>):Promise<ResolvedLogo>{
 let retryable=false;const failures:string[]=[];
 const attempt=async(url:string,source:string):Promise<ResolvedLogo|null>=>{
  try{const r=await request(url);if(!r.ok){retryable ||= r.status===429||r.status>=500;await r.body?.cancel();return null;}
   const bytes=new Uint8Array(await r.arrayBuffer());if(!await validLogo(bytes,hashes,source==='official-og',['eodhd','wikidata-p154','official-logo'].includes(source)))return null;
   const pixels=await logoPixels(bytes);const metadata=await sharp(pixels).metadata();const preview=await sharp(pixels,{limitInputPixels:16_000_000}).resize(32,32,{fit:'inside'}).ensureAlpha().raw().toBuffer();
   let visible=0,dark=0;for(let i=0;i<preview.length;i+=4)if(preview[i+3]>32){visible++;if(Math.min(preview[i],preview[i+1],preview[i+2])<220)dark++;}
   let renderer=sharp(pixels,{limitInputPixels:16_000_000,density:metadata.format==='svg'?Math.max(1,72*256/Math.max(metadata.width??256,metadata.height??256)):72});
   if(visible&&dark/visible<.01)renderer=renderer.flatten({background:'#263238'});
   const output=await renderer.resize(128,128,{fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer();
   return {source,sourceUrl:url,originalHash:iconHash(bytes),width:metadata.width,height:metadata.height,format:metadata.format,bytes:output,asset:iconHash(output)};
  }catch(e){retryable=true;failures.push(new URL(url).hostname+': '+String(e).slice(0,100));return null;}
 };
 // Preserve the existing dedicated vendor before the added identity-matched sources.
 if(general.LogoURL&&process.env.VALUE_NO_EODHD!=='1')try{const u=new URL(general.LogoURL,'https://eodhd.com');if(u.origin==='https://eodhd.com'){const result=await attempt(u.href,'eodhd');if(result)return result;}}catch{}
 const matches=matchLogoRows(company,rows,general.WebURL);
 for(const url of new Set(matches.flatMap(r=>r.logo?[commonsUrl(r.logo.value)].filter((u):u is string=>!!u):[]))){const result=await attempt(url,'wikidata-p154');if(result)return {...result,wikidataItem:matches[0]?.item.value};}
 const website=websiteUrl(general.WebURL??matches.find(r=>r.website)?.website.value);
 if(website){
  try{let r:Response|undefined;
   if(website.startsWith('http:'))try{r=await request(website.replace(/^http:/,'https:'));if(!r.ok){await r.body?.cancel();r=undefined;}}catch{}
   r??=await request(website);if(r.ok){const html=await r.text();const candidates=officialCandidates(html,r.url||website);
   for(const c of candidates){
    if(c.source==='official-manifest'){
     try{const manifest=await request(c.url);if(!manifest.ok){await manifest.body?.cancel();continue;}const data=await manifest.json();
      const icons=(Array.isArray(data.icons)?data.icons:[]).filter((i:{src?:string})=>typeof i.src==='string').sort((a:{sizes?:string},b:{sizes?:string})=>parseInt(b.sizes??'0')-parseInt(a.sizes??'0')).slice(0,8);
      for(const icon of icons){const url=new URL(icon.src,c.url).href;if(!websiteUrl(url))continue;const result=await attempt(url,c.source);if(result)return {...result,website};}
     }catch{retryable=true;}
    }else{const result=await attempt(c.url,c.source);if(result)return {...result,website};}
   }
  }else{retryable ||= r.status===429||r.status>=500;await r.body?.cancel();}}catch{retryable=true;}
  // Common paths are useful on JavaScript-only sites without declared icons.
  for(const path of ['/apple-touch-icon.png','/favicon.ico']){const result=await attempt(new URL(path,website).href,'official-icon');if(result)return {...result,website};}
  const result=await attempt('https://www.google.com/s2/favicons?domain='+encodeURIComponent(new URL(website).hostname)+'&sz=128','google-favicon');if(result)return {...result,website};
 }
 return {source:null,retryable,failures,website:website??undefined};
}
