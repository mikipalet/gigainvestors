import {beforeEach,describe,expect,it,vi} from 'vitest';
import {gunzipSync} from 'node:zlib';
vi.mock('@/lib/value/published-source',()=>({readPublishedBytes:vi.fn()}));
import {readPublishedBytes} from '@/lib/value/published-source';
import {GET} from '@/app/data/v/[...path]/route';
import {GET as legacy} from '@/app/api/value/data/[...path]/route';
const call=(file:string,encoding='gzip')=>GET(new Request('http://localhost/data/v/'+file,{headers:{'accept-encoding':encoding}}),{params:Promise.resolve({path:file.split('/')})});
describe('same-origin published bytes',()=>{
 beforeEach(()=>{vi.mocked(readPublishedBytes).mockReset();vi.mocked(readPublishedBytes).mockResolvedValue(new TextEncoder().encode(' { "rows": [] }\n'));});
 it('preserves exact upstream bytes, including whitespace',async()=>{
  expect(await (await call('index/default.json','identity')).text()).toBe(' { "rows": [] }\n');
 });
 it('preserves punctuation in published search shard names',async()=>{
  for(const file of ['search/a&.json','search/b-.json','search/c..json'])expect((await call(file)).status).toBe(200);
 });
 it('rejects private paths and arbitrary origins without reading storage',async()=>{
  for(const file of ['staging/unresolved-shares.json','https://example.com/a.json','search/../meta.json','index/private.json'])expect((await call(file)).status).toBe(404);
  expect(readPublishedBytes).not.toHaveBeenCalled();
 });
 it('compresses immutable views and keeps CDN responses purgeable',async()=>{
  const response=await call('views/'+'a'.repeat(24)+'.json');
  expect(response.headers.get('cache-control')).toContain('immutable');
  expect(response.headers.get('vercel-cdn-cache-control')).toContain('31536000');
  expect(response.headers.get('vercel-cache-tag')).toBe('value-data');
  expect(response.headers.get('vary')).toBe('Accept-Encoding');
  expect(gunzipSync(Buffer.from(await response.arrayBuffer())).toString()).toBe(' { "rows": [] }\n');
 });
 it('uses short shared caching with no browser staleness for mutable files',async()=>{
  for(const file of ['meta.json','index/default.json','search/manifest.json']){
   const response=await call(file);
   expect(response.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
   expect(response.headers.get('vercel-cdn-cache-control')).toBe('public, s-maxage=60, stale-while-revalidate=300');
  }
 });
 it('never caches misses or errors and never returns upstream secrets',async()=>{
  vi.mocked(readPublishedBytes).mockResolvedValue(null);
  expect((await call('meta.json')).status).toBe(404);
  vi.mocked(readPublishedBytes).mockRejectedValue(new Error('secret upstream token'));
  const response=await call('meta.json');expect(response.status).toBe(503);
  expect(response.headers.get('cache-control')).toBe('no-store');expect(await response.text()).not.toContain('token');
 });
 it('honors gzip q=0',async()=>{expect((await call('meta.json','gzip;q=0')).headers.has('content-encoding')).toBe(false);});
 it('redirects legacy clients to the protected data path',async()=>{
  const response=await legacy(new Request('https://test/api/value/data/meta.json'),{params:Promise.resolve({path:['meta.json']})});
  expect(response.status).toBe(308);expect(response.headers.get('location')).toBe('/data/v/meta.json');
 });
});
