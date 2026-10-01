import {it,expect} from 'vitest';
import sharp from 'sharp';
import {resolveManualLogo} from '../../../lib/value/logo-manual';
it('validates local manual pixels and retains supplied provenance',async()=>{
 const bytes=await sharp({create:{width:100,height:100,channels:4,background:'#336699'}}).png().toBuffer();
 const result=await resolveManualLogo({file:'KO.US.png',source:'Official header'},async()=>{throw Error('no network');},new Set(),()=>bytes);
 expect(result?.source).toBe('manual');expect(result?.asset).toMatch(/^[a-f0-9]{64}$/);expect(result?.provenance.source).toBe('Official header');
});
it('rejects invalid local bytes and traversal',async()=>{
 const request=async()=>new Response('not an image');
 expect(await resolveManualLogo({file:'../x.png',source:'reviewed'},request,new Set(),()=>Buffer.from('x'))).toBeNull();
 expect(await resolveManualLogo({file:'x.png',source:'reviewed'},request,new Set(),()=>Buffer.from('x'))).toBeNull();
});
it('validates remote manual URLs through the normal image validator',async()=>{
 expect(await resolveManualLogo({url:'https://example.com/logo.png',source:'official site',note:'Header'},async()=>new Response('HTML error'),new Set())).toBeNull();
});
