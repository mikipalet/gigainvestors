import {beforeEach,describe,expect,it,vi} from 'vitest';
import {gunzipSync} from 'node:zlib';
vi.mock('@/lib/value/store',()=>({readStore:vi.fn()}));
import {readStore} from '@/lib/value/store';
import {GET} from '@/app/api/value/data/[...path]/route';
const call=(file:string,encoding='gzip')=>GET(new Request('http://localhost/api/value/data/'+file,{headers:{'accept-encoding':encoding}}),{params:Promise.resolve({path:file.split('/')})});
describe('same-origin published browser data',()=>{
 beforeEach(()=>vi.mocked(readStore).mockReset());
 it('serves the public directory used by the empty search drawer',async()=>{
  const rows=[{id:'ADBE.US',n:'Adobe'}];vi.mocked(readStore).mockResolvedValue(rows);
  const response=await call('index/default.json','identity');
  expect(response.status).toBe(200);expect(await response.json()).toEqual(rows);
  expect((await call('index/private.json')).status).toBe(404);
 });
 it('serves quarter snapshots for historical investor verdicts',async()=>{
  const rows=[['AAPL.US','PPPPP',1,false]];vi.mocked(readStore).mockResolvedValue(rows);
  const response=await call('history/2018Q3.json','identity');
  expect(response.status).toBe(200);expect(await response.json()).toEqual(rows);
  expect(readStore).toHaveBeenCalledWith('history/2018Q3.json');
  vi.mocked(readStore).mockClear();
  for(const file of ['history/2018Q5.json','history/private.json','history/../meta.json'])expect((await call(file)).status).toBe(404);
  expect(readStore).not.toHaveBeenCalled();
 });
 it('preserves punctuation in published search shard names',async()=>{
  vi.mocked(readStore).mockResolvedValue({rows:[],aliases:{}});
  for(const file of ['search/a&.json','search/b-.json','search/c..json'])expect((await call(file)).status).toBe(200);
 });
 it('rejects private paths and arbitrary origins without reading storage',async()=>{
  for(const file of ['staging/unresolved-shares.json','https://example.com/a.json','search/../meta.json'])expect((await call(file)).status).toBe(404);
  expect(readStore).not.toHaveBeenCalled();
 });
 it('compresses immutable views and varies by encoding',async()=>{
  const data={columns:['id'],rows:[['KO.US']]};vi.mocked(readStore).mockResolvedValue(data);
  const file='views/'+'a'.repeat(24)+'.json',compressed=await call(file);
  expect(compressed.headers.get('cache-control')).toContain('immutable');
  expect(compressed.headers.get('vary')).toBe('Accept-Encoding');
  expect(JSON.parse(gunzipSync(Buffer.from(await compressed.arrayBuffer())).toString())).toEqual(data);
  expect(await (await call(file,'identity')).json()).toEqual(data);
 });
});
