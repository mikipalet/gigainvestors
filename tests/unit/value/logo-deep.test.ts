import {expect,it} from 'vitest';
import sharp from 'sharp';
import {resolveDeepLogo,stageBrand} from '@/lib/value/logo-deep';
import type {Company} from '@/lib/value/types';
it('stages the issuer header before Wikimedia and leaves identity review pending',async()=>{
 const calls:string[]=[];const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><path fill="red" d="M0 0h100v40H0z"/></svg>';
 const request:typeof fetch=async input=>{const url=String(input);calls.push(url);if(url.endsWith('robots.txt'))return new Response('',{status:404});return new Response(url.endsWith('logo.svg')?svg:'<header><a href="/"><img src="logo.svg" alt="Issuer logo"></a></header>');};
 const result=await resolveDeepLogo({id:'I.US',name:'Issuer',listings:[]} as unknown as Company,{WebURL:'https://issuer.test/'},[],request,new Set());
 expect(result.source).toBe('official-header');expect(result.identityReview).toBe('pending');expect(calls.every(u=>!u.includes('wikipedia'))).toBe(true);
 expect(await sharp(result.bytes!).metadata()).toMatchObject({width:128,height:128,format:'webp'});
 const {data,info}=await sharp(result.bytes!).raw().toBuffer({resolveWithObject:true});
 expect(data[0]).toBeGreaterThan(245);expect(data[(64*info.width+64)*info.channels+1]).toBeLessThan(20);
});
it('rejects unsafe external SVG references and a denied source before staging',async()=>{
 const result=await stageBrand({url:'https://issuer.test/logo.svg',page:'https://issuer.test',source:'official-header',inline:'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><image href="https://external.test/private"/></svg>'},fetch,new Set(),[]);
 expect(result).toBeNull();
});
it('pads an opaque report logo with its paper colour without stretching it',async()=>{
 const bytes=await sharp({create:{width:160,height:40,channels:3,background:'#aa2244'}}).png().toBuffer();
 const result=await stageBrand({url:'https://issuer.test/report.pdf#page=1',page:'https://issuer.test/report.pdf',source:'annual-report',bytes},fetch,new Set(),[]);
 const {data}=await sharp(result!.bytes!).raw().toBuffer({resolveWithObject:true});
 expect(data[0]).toBeGreaterThan(160);expect(data[0]).toBeLessThan(180);
 expect(data[1]).toBeLessThan(45);expect(data[2]).toBeGreaterThan(55);
});
