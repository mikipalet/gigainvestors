import {afterEach,expect,it,vi} from 'vitest';
import {readPublishedBytes} from '@/lib/value/published-source';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('uses the fixed GitHub contents API and preserves exact bytes',async()=>{
 vi.stubEnv('VALUE_STORE_DIR','');vi.stubEnv('VALUE_DATA_GITHUB_TOKEN','test-only-token');
 const bytes=' { "a": 1 }\n';const fetcher=vi.fn().mockResolvedValue(new Response(bytes));vi.stubGlobal('fetch',fetcher);
 expect(Buffer.from((await readPublishedBytes('search/a&.json'))!).toString()).toBe(bytes);
 expect(fetcher).toHaveBeenCalledWith('https://api.github.com/repos/mikipalet/gigainvestors-value-data/contents/search/a%26.json?ref=main',expect.objectContaining({headers:expect.objectContaining({Authorization:'Bearer test-only-token',Accept:'application/vnd.github.raw+json'}),redirect:'error'}));
});
it('fails closed in production without credentials even with fallback enabled',async()=>{
 vi.stubEnv('VALUE_STORE_DIR','');vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('VALUE_DATA_GITHUB_TOKEN','');vi.stubEnv('VALUE_DATA_PUBLIC_FALLBACK','1');
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 await expect(readPublishedBytes('meta.json')).rejects.toThrow('VALUE_DATA_GITHUB_TOKEN');expect(fetcher).not.toHaveBeenCalled();
});
it('rejects traversal and non-published paths before fetching',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 for(const file of ['../meta.json','search/../meta.json','/meta.json','staging/secret.json','https://evil.test/a.json','search/%2e%2e.json'])await expect(readPublishedBytes(file)).rejects.toThrow('Invalid');
 expect(fetcher).not.toHaveBeenCalled();
});
it('allows fallback only when explicitly requested outside production',async()=>{
 vi.stubEnv('VALUE_STORE_DIR','');vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('VALUE_DATA_GITHUB_TOKEN','');vi.stubEnv('VALUE_DATA_PUBLIC_FALLBACK','1');
 const fetcher=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetcher);
 await readPublishedBytes('meta.json');expect(fetcher.mock.calls[0][0]).toMatch(/^https:\/\/raw\.githubusercontent\.com\//);
 expect(fetcher.mock.calls[0][1].headers).toEqual({});
});
