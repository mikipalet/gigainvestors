import {afterEach,expect,it,vi} from 'vitest';
import {logoRequest} from '@/lib/value/logo-fetch';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('identifies the bot to Wikimedia and stops sending requests during Retry-After',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response('busy',{status:429,headers:{'Retry-After':'120'}}));vi.stubGlobal('fetch',fetcher);
 const request=logoRequest();
 expect((await request('https://query.wikidata.org/sparql?query=test')).status).toBe(429);
 expect(new Headers(fetcher.mock.calls[0][1].headers).get('user-agent')).toContain('https://github.com/mikipalet/gigainvestors');
 await expect(request('https://commons.wikimedia.org/wiki/Special:FilePath/test.svg')).rejects.toThrow('cooldown');
 expect(fetcher).toHaveBeenCalledTimes(1);
});
it('bounds streamed bytes even if the server omits Content-Length',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new Uint8Array(2_000_001))));
 await expect(logoRequest()('https://issuer.test/image.png')).rejects.toThrow('too large');
});
