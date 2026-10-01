import {expect,it} from 'vitest';
import sharp from 'sharp';
import {validLogo} from '@/lib/value/logo-validation';
import {matchLogoRows,officialCandidates,resolveCompanyLogo} from '@/lib/value/logo-sources';
import type {Company} from '@/lib/value/types';
const company={id:'FDS.US',code:'FDS',exchange:'US',country:'US',isin:'US3030751057',lei:'LEI1',listings:[]} as unknown as Company;
const row=(item:string,fields:Record<string,string>)=>Object.fromEntries(Object.entries({item,...fields}).map(([k,value])=>[k,{value}]));
it('matches exact identifiers and rejects ambiguous identities and foreign ticker collisions',()=>{
 const rows=[row('Q1',{ticker:'FDS',exchange:'http://www.wikidata.org/entity/Q13677',logo:'a'}),row('Q2',{ticker:'FDS',exchange:'http://www.wikidata.org/entity/Q217475',logo:'b'})];
 expect(matchLogoRows(company,rows).map(r=>r.logo.value)).toEqual(['a']);
 expect(matchLogoRows(company,[...rows,row('Q3',{isin:company.isin!,logo:'c'})])[0].logo.value).toBe('c');
 expect(matchLogoRows(company,[row('Q1',{lei:'LEI1'}),row('Q2',{lei:'LEI1'})])).toEqual([]);
 expect(matchLogoRows(company,[row('Q1',{website:'http://www.factset.com/'} )],'https://factset.com')).toHaveLength(1);
 expect(matchLogoRows(company,[row('Q1',{website:'https://factset.com.evil.test'})],'https://factset.com')).toEqual([]);
});
it('prefers apple icons then largest declared icons and resolves relative URLs',()=>{
 const candidates=officialCandidates(`<link rel="icon" sizes="32x32" href="small.png"><link rel="icon" sizes="256x256" href="/large.png"><link rel="apple-touch-icon" href="apple.png"><link rel="manifest" href="app.json"><meta property="og:image" content="banner.jpg">`,'https://issuer.test/path/');
 expect(candidates.map(c=>c.url)).toEqual(['https://issuer.test/path/apple.png','https://issuer.test/large.png','https://issuer.test/path/small.png','https://issuer.test/path/app.json','https://issuer.test/path/banner.jpg']);
});
it('rejects 32px, truncated rasters, banners, unsafe SVG, and accepts scalable marks',async()=>{
 const png=await sharp({create:{width:64,height:64,channels:4,background:'#123456'}}).png().toBuffer();
 expect(await validLogo(png)).toBe(true);
 expect(await validLogo(await sharp(png).resize(32,32).toBuffer())).toBe(false);
 expect(await validLogo(png.subarray(0,50))).toBe(false);
 expect(await validLogo(await sharp(png).resize(900,100).toBuffer())).toBe(false);
 expect(await validLogo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M0 0h16v16H0z"/></svg>'))).toBe(true);
 expect(await validLogo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><script>alert(1)</script></svg>'))).toBe(false);
});
it('falls through corrupt P154 and undersized official icons to a non-default Google image',async()=>{
 const png=await sharp({create:{width:128,height:128,channels:4,background:'#123456'}}).png().toBuffer();
 const tiny=await sharp(png).resize(32,32).toBuffer();
 const request:typeof fetch=async input=>{
  const url=String(input);
  if(url==='https://issuer.test/')return new Response('<link rel="icon" href="tiny.png">',{headers:{'content-type':'text/html'}});
  if(url.includes('google.com'))return new Response(new Uint8Array(png),{headers:{'content-type':'image/png'}});
  return new Response(new Uint8Array(url.includes('tiny')?tiny:Buffer.from('not an image')),{headers:{'content-type':'image/png'}});
 };
 const result=await resolveCompanyLogo(company,{WebURL:'https://issuer.test/'},[row('Q1',{isin:company.isin!,logo:'http://commons.wikimedia.org/wiki/Special:FilePath/Test.svg'})],request,new Set());
 expect(result.source).toBe('google-favicon');
 expect(result.sourceUrl).toContain('sz=128');
});
it('uses manifest icons before social cards and rejects photographic social JPEGs',async()=>{
 const logo=await sharp({create:{width:128,height:128,channels:4,background:'#be1234'}}).png().toBuffer();
 const visited:string[]=[];
 const request:typeof fetch=async input=>{
  const u=String(input);visited.push(u);
  if(u==='https://issuer.test/')return new Response('<link rel="manifest" href="/app/site.json"><meta property="og:image" content="/social.jpg">');
  if(u.endsWith('site.json'))return Response.json({icons:[{src:'small.png',sizes:'32x32'},{src:'large.png',sizes:'256x256'}]});
  if(u.endsWith('large.png'))return new Response(new Uint8Array(logo));
  return new Response(null,{status:404});
 };
 const result=await resolveCompanyLogo(company,{WebURL:'https://issuer.test/'},[],request,new Set());
 expect(result.source).toBe('official-manifest');expect(result.sourceUrl).toBe('https://issuer.test/app/large.png');
 expect(visited).not.toContain('https://issuer.test/social.jpg');
 expect(await validLogo(await sharp(logo).jpeg().toBuffer(),undefined,true)).toBe(false);
});
it('rejects hash-listed Google defaults even when their decoded size is sufficient',async()=>{
 const png=await sharp({create:{width:128,height:128,channels:4,background:'#aabbcc'}}).png().toBuffer();
 const {iconHash}=await import('@/lib/value/logo-validation');
 const request:typeof fetch=async input=>String(input).includes('google.com')?new Response(new Uint8Array(png)):new Response(null,{status:404});
 const result=await resolveCompanyLogo(company,{WebURL:'https://issuer.test'},[],request,new Set([iconHash(png)]));
 expect(result.asset).toBeUndefined();expect(result.source).toBeNull();
});
it('decodes a real 64px bitmap ICO and rejects an ICO directory with invented frame dimensions',async()=>{
 const icon=Buffer.alloc(22+40+64*64*4);icon.writeUInt16LE(1,2);icon.writeUInt16LE(1,4);icon[6]=64;icon[7]=64;icon.writeUInt32LE(icon.length-22,14);icon.writeUInt32LE(22,18);
 icon.writeUInt32LE(40,22);icon.writeInt32LE(64,26);icon.writeInt32LE(128,30);icon.writeUInt16LE(1,34);icon.writeUInt16LE(32,36);icon.fill(255,62);
 expect(await validLogo(icon)).toBe(true);
 icon.writeInt32LE(32,26);expect(await validLogo(icon)).toBe(false);
});
it('accepts scalable wordmarks with internal SVG clip references, without loading external images',async()=>{
 const mark='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 60"><defs><clipPath id="c"><rect width="500" height="60"/></clipPath></defs><path clip-path="url(#c)" fill="red" d="M0 0h500v60H0z"/></svg>';
 expect(await validLogo(Buffer.from(mark))).toBe(true);
 expect(await validLogo(Buffer.from(mark.replace('url(#c)','url(https://external.test/a.svg)')))).toBe(false);
});
it('matches verified exchange IDs and numeric ticker padding without accepting another market',()=>{
 const rows=[row('Q1',{ticker:'2330',exchange:'http://www.wikidata.org/entity/Q548621',logo:'tsmc'}),row('Q2',{ticker:'2330',exchange:'http://www.wikidata.org/entity/Q217475',logo:'other'})];
 expect(matchLogoRows({...company,code:'02330',exchange:'TW',isin:null,lei:null},rows)[0].logo.value).toBe('tsmc');
 expect(matchLogoRows({...company,code:'2330',exchange:'US',isin:null,lei:null},rows)).toEqual([]);
 expect(matchLogoRows({...company,exchange:'MI',code:'MONC',isin:null,lei:null},[row('Q3',{ticker:'MONC',exchange:'http://www.wikidata.org/entity/Q936563'})])).toHaveLength(1);
});
it('recognizes an explicit brand mark linked to the issuer home page, not customer or partner logos',()=>{
 const html='<a href="/"><img alt="Company logo" src="/brand.svg"></a><a href="https://partner.test/"><img alt="Partner logo" src="/partner.svg"></a><img alt="logo" src="/customer.svg">';
 expect(officialCandidates(html,'https://issuer.test/').map(c=>c.url)).toEqual(['https://issuer.test/brand.svg']);
});
it('honors the document base URL for official icons',()=>{
 expect(officialCandidates('<base href="https://issuer.test/assets/"><link rel="icon" href="images/favicon.ico">','https://issuer.test/')[0].url).toBe('https://issuer.test/assets/images/favicon.ico');
});
it('accepts the first explicitly named site logo on a landing page without a home link',()=>{
 expect(officialCandidates('<img class="indexlogo" src="/mark.png"><img class="partnerlogo" src="/partner.png">','https://issuer.test/').map(c=>c.url)).toEqual(['https://issuer.test/mark.png']);
});
it('allows a transparent 200px brand wordmark, but never promotes a 32px favicon or wide banner',async()=>{
 const mark=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40"><path fill="red" d="M0 0h100v40H0z"/></svg>')).png().toBuffer();
 expect(await validLogo(mark,undefined,false,true)).toBe(true);
 expect(await validLogo(mark)).toBe(false);
 expect(await validLogo(await sharp(mark).resize(32,32).toBuffer(),undefined,false,true)).toBe(false);
 expect(await validLogo(await sharp(mark).resize(900,100).toBuffer(),undefined,false,true)).toBe(false);
});
it('recognizes a brand link to a localized index page on the same official host',()=>{
 expect(officialCandidates('<a href="/en/index.html"><img src="/logo.svg"></a>','https://issuer.test/').map(c=>c.url)).toEqual(['https://issuer.test/logo.svg']);
 expect(officialCandidates('<a href="https://partner.test/en/index.html"><img src="/logo.svg"></a>','https://issuer.test/')).toEqual([]);
});
it('does not treat a fragment or missing link as an issuer home link',()=>{
 expect(officialCandidates('<a href="#clients"><img src="/partner-logo.png"></a><a><img src="/client-logo.png"></a>','https://issuer.test/')).toEqual([]);
});
it('tries HTTPS first but preserves an explicitly declared HTTP-only official site',async()=>{
 const png=await sharp({create:{width:64,height:64,channels:4,background:'#102938'}}).png().toBuffer();
 const request:typeof fetch=async input=>{
  const url=String(input);if(url.startsWith('https://issuer.test'))throw Error('TLS not supported');
  if(url==='http://issuer.test/')return new Response('<link rel="apple-touch-icon" href="/mark.png">');
  if(url==='http://issuer.test/mark.png')return new Response(new Uint8Array(png));
  return new Response(null,{status:404});
 };
 const result=await resolveCompanyLogo(company,{WebURL:'http://issuer.test/'},[],request,new Set());
 expect(result.sourceUrl).toBe('http://issuer.test/mark.png');
});
it('renders white transparent marks with a contrasting background and rejects empty transparent images',async()=>{
 const empty=await sharp({create:{width:64,height:64,channels:4,background:'#00000000'}}).png().toBuffer();
 expect(await validLogo(empty)).toBe(false);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="5" fill="white"/></svg>';
 const request:typeof fetch=async()=>new Response(svg);
 const result=await resolveCompanyLogo(company,{LogoURL:'https://eodhd.com/img/logos/test.svg'},[],request,new Set());
 const {data}=await sharp(result.bytes!).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 expect(data[3]).toBe(255);expect(data[0]).toBeLessThan(100);
 expect((await sharp(result.bytes!).metadata()).width).toBe(128);
});
