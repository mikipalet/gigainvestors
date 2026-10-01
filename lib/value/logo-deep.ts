import sharp from 'sharp';
import {browserBrands} from './logo-browser';
import type {ReviewedReportCrop} from './logo-report';
import {iconHash,logoPixels,validLogo} from './logo-validation';
import {matchLogoRows,type LogoBinding,type ResolvedLogo} from './logo-sources';
import {officialBrands,wikipediaBrands,robotsRequest,svgSymbol,type LogoAttempt,type BrandCandidate} from './logo-discovery';
import type {Company} from './types';
import type {GeneralInfo} from './enrichment';
export interface LogoOverride {websites?:string[];wikipediaTitle?:string;targetedPages?:string[];searchEvidence?:string[];reportUrl?:string;reportCrop?:ReviewedReportCrop;candidates?:BrandCandidate[];parent?:string;relationship?:string;evidence?:string}
export async function stageBrand(candidate:BrandCandidate,request:typeof fetch,hashes:Set<string>,attempts:LogoAttempt[]):Promise<ResolvedLogo|null>{
 try{
  const response=candidate.inline||candidate.bytes?null:await request(candidate.url);
  if(response&&!response.ok){attempts.push({source:candidate.source,url:candidate.url,outcome:'HTTP '+response.status});return null;}
  let bytes:Buffer=candidate.bytes?Buffer.from(candidate.bytes):candidate.inline?Buffer.from(candidate.inline):Buffer.from(await response!.arrayBuffer());
  if(candidate.crop)bytes=await sharp(bytes,{limitInputPixels:16_000_000}).extract(candidate.crop).png().toBuffer();
  if(candidate.symbol){const extracted=svgSymbol(bytes.toString('utf8'),candidate.symbol);if(!extracted)throw Error('SVG symbol unavailable');bytes=Buffer.from(extracted);}
  if(!await validLogo(bytes,hashes,false,true)){attempts.push({source:candidate.source,url:candidate.url,outcome:'rejected: decode/size/default/safety validation'});return null;}
  const pixels=await logoPixels(bytes),meta=await sharp(pixels).metadata();
  // Keep the aspect ratio; a square paper-colour canvas is always served.
  const preview=await sharp(pixels).resize(32,32,{fit:'inside'}).ensureAlpha().raw().toBuffer();let visible=0,dark=0;
  for(let i=0;i<preview.length;i+=4)if(preview[i+3]>32){visible++;if(Math.min(preview[i],preview[i+1],preview[i+2])<220)dark++;}
  const opaque=(await sharp(pixels).stats()).isOpaque;
  const corner=await sharp(pixels).flatten({background:'#ffffff'}).extract({left:0,top:0,width:1,height:1}).removeAlpha().raw().toBuffer();
  const paper=`rgb(${corner[0]},${corner[1]},${corner[2]})`;
  const background=visible&&((meta.hasAlpha&&!opaque&&dark/visible<.9)||dark/visible<.01)?'#263238':opaque?paper:'#ffffff';
  const output=await sharp(pixels,{limitInputPixels:16_000_000,density:meta.format==='svg'?Math.max(1,72*512/Math.max(meta.width??512,meta.height??512)):72}).resize(128,128,{fit:'contain',background,withoutEnlargement:meta.format!=='svg'}).flatten({background}).webp({quality:95}).toBuffer();
  attempts.push({source:candidate.source,url:candidate.url,outcome:'decoded, normalized; identity review required'});
  return {source:candidate.source,...(candidate.crop?{crop:candidate.crop}:{}),sourceUrl:candidate.url,originalHash:iconHash(bytes),width:meta.width,height:meta.height,format:meta.format,asset:iconHash(output),bytes:output,originalBytes:bytes};
 }catch(e){attempts.push({source:candidate.source,url:candidate.url,outcome:String(e).slice(0,200)});return null;}
}
export async function resolveDeepLogo(company:Company,general:GeneralInfo,rows:LogoBinding[],request:typeof fetch,hashes:Set<string>,override:LogoOverride={},fallback?:(attempts:LogoAttempt[])=>Promise<ResolvedLogo|null>):Promise<ResolvedLogo&{attempts:LogoAttempt[];identityReview?:string}>{
 const attempts:LogoAttempt[]=[];const matches=matchLogoRows(company,rows,general.WebURL);
 const sites=[...(override.websites??[]),...(general.WebURL?[general.WebURL]:[]),...matches.flatMap(r=>r.website?[r.website.value]:[])];
 const officialRequest=robotsRequest(request,attempts);
 for await(const c of officialBrands(company,sites,request,attempts)){const result=await stageBrand(c,officialRequest,hashes,attempts);if(result)return {...result,website:c.page,attempts,identityReview:'pending'};}
 if(process.env.VALUE_LOGO_BROWSER==='1')for(const c of await browserBrands(company,sites,request,attempts)){const result=await stageBrand(c,officialRequest,hashes,attempts);if(result)return {...result,website:c.page,attempts,identityReview:'pending'};}
 for await(const c of wikipediaBrands(company,rows,sites[0],request,attempts,override.wikipediaTitle)){const result=await stageBrand(c,request,hashes,attempts);if(result)return {...result,website:sites[0],attempts,identityReview:'pending'};}
 if(fallback){const result=await fallback(attempts);if(result)return {...result,attempts};}
 for(const evidence of override.searchEvidence??[])attempts.push({source:'targeted-search',url:evidence,outcome:'per-company official-domain logo search; results saved'});
 for await(const c of officialBrands(company,override.targetedPages??[],request,attempts)){const result=await stageBrand({...c,source:'official-targeted'},officialRequest,hashes,attempts);if(result)return {...result,website:c.page,attempts,identityReview:'pending'};}
 // Explicitly reviewed press-kit or official-domain URLs are attempted last.
 for(const c of override.candidates??[]){const result=await stageBrand(c,officialRequest,hashes,attempts);if(result)return {...result,website:sites[0],attempts,identityReview:'pending'};}
 attempts.push({source:'targeted-search',outcome:override.candidates?.length?'reviewed candidates exhausted':'no reviewed official-domain search candidate yet'});
 return {source:null,website:sites[0],attempts,retryable:true};
}
