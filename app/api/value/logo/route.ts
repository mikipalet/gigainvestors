import {readStore} from '@/lib/value/store';
import {createHash} from 'node:crypto';
/** A provider can return a valid grey PNG with HTTP 404. Browsers still draw it.
 * Strip that image so CompanyLogo can display its own monogram instead. */
export async function GET(request:Request) {
 const asset=new URL(request.url).searchParams.get('asset');
 if(asset!==null){
  if(!/^[a-f0-9]{64}$/.test(asset))return new Response(null,{status:400});
  try{
   const cached=await readStore<{data:string}>(`logos/${asset}.json`,2592000);
   if(!cached||typeof cached.data!=='string'||cached.data.length>500000)return new Response(null,{status:404});
   const bytes=Buffer.from(cached.data,'base64');
   if(createHash('sha256').update(bytes).digest('hex')!==asset)return new Response(null,{status:404});
   return new Response(bytes,{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
  }catch{return new Response(null,{status:204});}
 }
 const domain=new URL(request.url).searchParams.get('domain')??'';
 const eod=new URL(request.url).searchParams.get('eod')??'';
 const validEod=/^[A-Z0-9-]{1,12}\/[A-Za-z0-9&._-]{1,60}\.(?:png|svg|jpg)$/i.test(eod)&&!eod.includes('..');
 if(!validEod&&(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)||domain.length>253))return new Response(null,{status:400});
 try {
  const response=await fetch(validEod?`https://eodhd.com/img/logos/${eod}`:`https://icons.duckduckgo.com/ip3/${domain}.ico`,{next:{revalidate:604800},signal:AbortSignal.timeout(5000)});
  if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))return new Response(null,{status:204,headers:{'Cache-Control':'public, max-age=3600'}});
  const bytes=Buffer.from(await response.arrayBuffer());
  // libvips does not decode ICO. These small provider favicons are already
  // bounded; preserve the original image instead of replacing it with a monogram.
  const ico=bytes.length>=22&&bytes.readUInt32LE(0)===65536&&bytes.readUInt16LE(4)>0;
  if(ico&&bytes.length>262144)return new Response(null,{status:204});
  const sharp=(await import('sharp')).default;
  const resized=ico?bytes:await sharp(bytes,{limitInputPixels:16_000_000}).resize(96,96,{fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer();
  return new Response(new Uint8Array(resized),{headers:{'Content-Type':ico?'image/x-icon':'image/webp','Cache-Control':'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400','X-Content-Type-Options':'nosniff'}});
 } catch { return new Response(null,{status:204}); }
}
