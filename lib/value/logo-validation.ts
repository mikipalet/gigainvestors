import {createHash} from 'node:crypto';
import sharp from 'sharp';
import reviewedRejections from './logo-rejections.json';
export const iconHash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export const LOGO_VALIDATION_VERSION=2;
export const REJECTED_LOGO_HASHES=new Set<string>([
 ...reviewedRejections.map(r=>r.sha256),
 // Google default globe (128 request) and DuckDuckGo default, captured 2026-10-01.
 '59bfe9bc385ad69f50793ce4a53397316d7a875a7148a63c16df9b674c6cda64',
 'e5db88ea2322863ca17817b99d60006c625a31cff0dad49cf05d3c6d16a75c17',
 // Generic document/printer favicon found on unrelated company sites.
 'a94f8a8553caea8430dd4ca3cc01d4e318d19828f74cb65453ffb7f5d9e2f44d',
 // Photographs mislabeled as P154/site icons: SCREEN HQ, China Mobile event, Botanee building.
 '423f25bdc5988ad5a763c34d5408833029eb006dceceffeb5b77e6edfbcadadf',
 '04a54c8d32585edcf745a7bde7bd92ae9299c1c8e1d9b88e36be7193f21be0c8',
 '7f75386207071bac3bba1248ddda312c57a705c8f1ff50e4fc343812908200e5',
]);
/** Decode ICO frames, including the common uncompressed 24/32-bit DIB form. */
export async function logoPixels(bytes:Uint8Array):Promise<Buffer> {
 if(bytes[0]===0&&bytes[1]===0&&bytes[2]===1&&bytes[3]===0){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),count=view.getUint16(4,true);
  if(!count||count>100||bytes.length<6+count*16)throw Error('Invalid ICO');
  const frames=Array.from({length:count},(_,n)=>6+n*16).sort((a,b)=>(bytes[b]||256)-(bytes[a]||256));
  for(const i of frames){
   const width=bytes[i]||256,height=bytes[i+1]||256,size=view.getUint32(i+8,true),offset=view.getUint32(i+12,true);
   if(width<64||height<64||offset<6+count*16||offset+size>bytes.length||size<40)continue;
   const payload=bytes.slice(offset,offset+size);
   try{return await sharp(payload,{limitInputPixels:16_000_000}).png().toBuffer();}catch{}
   const d=new DataView(payload.buffer,payload.byteOffset,payload.byteLength),header=d.getUint32(0,true),bits=d.getUint16(14,true);
   const stride=Math.ceil(width*bits/32)*4;
   if(header<40||header>size||d.getInt32(4,true)!==width||d.getInt32(8,true)!==height*2||![24,32].includes(bits)||d.getUint32(16,true)!==0||size<header+stride*height)continue;
   const rgba=Buffer.alloc(width*height*4);let alpha=false;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=header+(height-1-y)*stride+x*(bits/8),q=(y*width+x)*4;
    rgba[q]=payload[p+2];rgba[q+1]=payload[p+1];rgba[q+2]=payload[p];rgba[q+3]=bits===32?payload[p+3]:255;alpha ||= rgba[q+3]>0;
   }
   const mask=header+stride*height,maskStride=Math.ceil(width/32)*4;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const q=(y*width+x)*4+3;if(!alpha)rgba[q]=255;
    if(size>=mask+maskStride*height&&(payload[mask+(height-1-y)*maskStride+(x>>3)]&(128>>(x%8))))rgba[q]=0;
   }
   return sharp(rgba,{raw:{width,height,channels:4}}).png().toBuffer();
  }
  throw Error('No decodable 64px ICO frame');
 }
 return Buffer.from(bytes);
}
export async function validLogo(bytes:Uint8Array,defaultHash?:string|Set<string>,squareOnly=false,brandMark=false):Promise<boolean> {
 if(!bytes.length||bytes.length>2_000_000)return false;
 const hash=iconHash(bytes);
 if(REJECTED_LOGO_HASHES.has(hash)||(typeof defaultHash==='string'?hash===defaultHash:defaultHash?.has(hash)))return false;
 const text=Buffer.from(bytes).toString('utf8');
 const svg=/<svg\b/i.test(text.slice(0,2048));
 if(svg&&(/<(?:script|foreignObject|image)\b|\bon\w+\s*=|<!ENTITY/i.test(text)||[...text.matchAll(/(?:href\s*=\s*["']|url\(\s*["']?)([^"'\s)]+)/gi)].some(m=>!m[1].startsWith('#'))))return false;
 try{
  const decoded=await logoPixels(bytes),input=sharp(decoded,{limitInputPixels:16_000_000});
  const m=await input.metadata(),w=m.width??0,h=m.height??0,ratio=w/h;
  const wordmark=brandMark&&!svg&&Math.max(w,h)>=64&&Math.min(w,h)>=16&&ratio>=1/14&&ratio<=14;
  if(!w||!h||(!svg&&!wordmark&&(w<64||h<64))||ratio>(svg?24:wordmark?14:4)||ratio<(svg?1/24:wordmark?1/14:.25)||(squareOnly&&(ratio<.8||ratio>1.25)))return false;
  // Metadata alone accepts truncated files. A full bounded decode is mandatory.
  await input.resize(128,128,{fit:'inside'}).raw().toBuffer();
  const stats=await input.stats();
  if(m.hasAlpha&&stats.channels.at(-1)?.max===0)return false;
  if(!svg&&stats.entropy>7)return false;
  if(wordmark&&(w<64||h<64)&&stats.entropy>6.8)return false;
  // Social cards are untrusted: avoid photographic JPEGs and high-entropy photos.
  if(squareOnly&&(m.format==='jpeg'||stats.entropy>7))return false;
  return true;
 }catch{return false;}
}
