import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { GET } from '@/app/api/value/logo/route';
beforeEach(()=>vi.stubEnv("VALUE_DATA_GITHUB_TOKEN","test-only"));
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('preserves bounded ICO favicons that sharp cannot decode',async()=>{
 const icon=Buffer.alloc(70);
 icon.writeUInt16LE(1,2);icon.writeUInt16LE(1,4);
 icon[6]=1;icon[7]=1;icon.writeUInt16LE(1,10);icon.writeUInt16LE(32,12);
 icon.writeUInt32LE(48,14);icon.writeUInt32LE(22,18);
 icon.writeUInt32LE(40,22);icon.writeInt32LE(1,26);icon.writeInt32LE(2,30);
 icon.writeUInt16LE(1,34);icon.writeUInt16LE(32,36);icon[65]=255;
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(icon,{headers:{'content-type':'image/x-icon'}})));
 const response=await GET(new Request('http://localhost/api/value/logo?domain=example.com'));
 expect(response.status).toBe(200);
 expect(response.headers.get('content-type')).toBe('image/x-icon');
 expect(Buffer.from(await response.arrayBuffer())).toEqual(icon);
});
it('does not serve a provider error image as a company logo',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response('placeholder',{status:404,headers:{'content-type':'image/png'}}));vi.stubGlobal('fetch',fetcher);
 const response=await GET(new Request('http://localhost/api/value/logo?domain=missing.example'));
 expect(response.status).toBe(204);expect(await response.text()).toBe('');
});
it('only requests the fixed icon provider and rejects malformed domains',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(new Uint8Array(await sharp({create:{width:200,height:100,channels:4,background:'#abcdef'}}).png().toBuffer()),{headers:{'content-type':'image/png'}}));vi.stubGlobal('fetch',fetcher);
 expect((await GET(new Request('http://localhost/api/value/logo?domain=example.com'))).status).toBe(200);
 expect(fetcher.mock.calls[0][0]).toBe('https://icons.duckduckgo.com/ip3/example.com.ico');
 expect((await GET(new Request('http://localhost/api/value/logo?domain=../secret'))).status).toBe(400);
 expect(fetcher).toHaveBeenCalledTimes(1);
});

it('serves a validated content-addressed asset from the fixed published store',async()=>{
 const {createHash}=await import('node:crypto');
 const bytes=await sharp({create:{width:128,height:128,channels:4,background:'#abcdef'}}).webp().toBuffer();
 const asset=createHash('sha256').update(bytes).digest('hex');
 const fetcher=vi.fn().mockResolvedValue(Response.json({data:bytes.toString('base64')}));vi.stubGlobal('fetch',fetcher);
 const response=await GET(new Request(`http://localhost/api/value/logo?asset=${asset}`));
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('image/webp');
 expect(response.headers.get('cache-control')).toContain('immutable');
 expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
 expect(fetcher.mock.calls[0][0]).toBe(`https://api.github.com/repos/mikipalet/gigainvestors-value-data/contents/logos/${asset}.json?ref=main`);
 expect((await GET(new Request('http://localhost/api/value/logo?asset=../../secret'))).status).toBe(400);
});
it('rejects cached assets whose bytes do not match their address',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({data:Buffer.from('wrong').toString('base64')})));
 expect((await GET(new Request('http://localhost/api/value/logo?asset='+'a'.repeat(64)))).status).toBe(404);
});
