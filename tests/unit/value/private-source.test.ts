import {afterEach,expect,it,vi} from 'vitest';
import {readPublishedBytes} from '@/lib/value/published-source';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const version='a'.repeat(64);
function setup(){vi.stubEnv('VALUE_STORE_DIR','');vi.stubEnv('VALUE_DATA_READ_WRITE_TOKEN','vercel_blob_rw_teststore_testsecret');}
it('reads only authenticated private Blob and preserves exact bytes and cache tags',async()=>{
 setup();const bytes=' { "a": 1 }\n';const fetcher=vi.fn().mockResolvedValueOnce(Response.json({version})).mockResolvedValueOnce(new Response(bytes));vi.stubGlobal('fetch',fetcher);
 expect(Buffer.from((await readPublishedBytes('search/a&.json'))!).toString()).toBe(bytes);
 expect(fetcher.mock.calls[0][0]).toBe('https://teststore.private.blob.vercel-storage.com/value/current.json?cache=0');
 expect(fetcher.mock.calls[1][0]).toBe(`https://teststore.private.blob.vercel-storage.com/value/versions/${version}/search/a%26.json`);
 for(const call of fetcher.mock.calls)expect(call[1]).toMatchObject({headers:{Authorization:'Bearer vercel_blob_rw_teststore_testsecret'},redirect:'error',next:{tags:['value-data']}});
});
it.each(['production','preview'])('fails closed without private credentials in %s',async env=>{
 vi.stubEnv('VALUE_STORE_DIR','');vi.stubEnv('VERCEL_ENV',env);vi.stubEnv('VALUE_DATA_READ_WRITE_TOKEN','');
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);await expect(readPublishedBytes('meta.json')).rejects.toThrow('VALUE_DATA_READ_WRITE_TOKEN');expect(fetcher).not.toHaveBeenCalled();
});
it('rejects traversal and non-published paths before fetching',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 for(const file of ['../meta.json','search/../meta.json','/meta.json','staging/secret.json','https://evil.test/a.json','search/%2e%2e.json'])await expect(readPublishedBytes(file)).rejects.toThrow('Invalid');
 expect(fetcher).not.toHaveBeenCalled();
});
it('rejects malformed version pointers before fetching a file',async()=>{
 setup();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({version:'https://evil.test'})));await expect(readPublishedBytes('meta.json')).rejects.toThrow('Invalid');
});
it('returns null for a missing published file and surfaces upstream failures',async()=>{
 setup();vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({version})).mockResolvedValueOnce(new Response('',{status:404})));expect(await readPublishedBytes('meta.json')).toBeNull();
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:403})));await expect(readPublishedBytes('meta.json')).rejects.toThrow('403');
});
it('retains immutable assets independently of the current snapshot pointer',async()=>{
 setup();const fetcher=vi.fn().mockResolvedValue(new Response('bytes'));vi.stubGlobal('fetch',fetcher);
 const file=`views/${'a'.repeat(24)}.json`;expect(Buffer.from((await readPublishedBytes(file))!).toString()).toBe('bytes');expect(fetcher).toHaveBeenCalledOnce();expect(fetcher.mock.calls[0][0]).toBe(`https://teststore.private.blob.vercel-storage.com/value/immutable/${file}`);
});
