import { afterEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/value/logo/route';
afterEach(()=>vi.unstubAllGlobals());
it('does not serve a provider error image as a company logo',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response('placeholder',{status:404,headers:{'content-type':'image/png'}}));vi.stubGlobal('fetch',fetcher);
 const response=await GET(new Request('http://localhost/api/value/logo?domain=missing.example'));
 expect(response.status).toBe(204);expect(await response.text()).toBe('');
});
it('only requests the fixed icon provider and rejects malformed domains',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response('image',{headers:{'content-type':'image/png'}}));vi.stubGlobal('fetch',fetcher);
 expect((await GET(new Request('http://localhost/api/value/logo?domain=example.com'))).status).toBe(200);
 expect(fetcher.mock.calls[0][0]).toBe('https://icons.duckduckgo.com/ip3/example.com.ico');
 expect((await GET(new Request('http://localhost/api/value/logo?domain=../secret'))).status).toBe(400);
 expect(fetcher).toHaveBeenCalledTimes(1);
});
